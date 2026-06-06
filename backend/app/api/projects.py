"""Projects API — /api/v1/projects.

Projects are Tasks enriched with per-user progress.  This router owns the
lifecycle from the learner's perspective: browse, start, take notes, submit
for peer review, retry after completion.

Status mapping (latest submission + optional progress → frontend label):
  no progress, no submission  →  "not_started"
  progress only, no submission  →  "doing"
  Submission.status = DRAFT     →  "doing"
  Submission.status in READY|MATCHED  →  "submitted"
  Submission.status = COMPLETED       →  "completed"
"""
import logging

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_power_user
from app.core.db import get_db
from app.core.logging import display_user, get_logger, log_user_journey
from app.models import Evaluation, Submission, Task, User, UserBadge
from app.models.enums import EvaluationStatus, SubmissionStatus, TaskStatus, UserRole
from app.models.user_task_progress import UserTaskProgress
from app.schemas.project import (
    ProjectBrief,
    ProjectDetail,
    ProjectNotesUpdate,
    ProjectRead,
    ProjectStartResponse,
    ProjectSubmitRequest,
    ProjectSubmitResponse,
    UserProjectStatus,
)
from app.schemas.task import TaskCreate, TaskRead, TaskUpdate
from app.services import matching
from app.services.project_progress import user_status_from_latest

router = APIRouter(prefix="/projects", tags=["projects"])
logger = get_logger(__name__)

_ACTIVE_SUB_STATUSES = (
    SubmissionStatus.DRAFT,
    SubmissionStatus.READY,
    SubmissionStatus.MATCHED,
)


# ── helpers ────────────────────────────────────────────────────────────────

def _user_status(progress: UserTaskProgress | None, sub: Submission | None) -> UserProjectStatus:
    status = user_status_from_latest(progress, sub)
    return status  # type: ignore[return-value]


def _latest_sub(db: Session, user_id: int, task_id: int) -> Submission | None:
    return db.scalar(
        select(Submission).where(
            Submission.user_id == user_id,
            Submission.task_id == task_id,
        ).order_by(Submission.attempt_number.desc())
    )


def _active_sub(db: Session, user_id: int, task_id: int) -> Submission | None:
    return db.scalar(
        select(Submission).where(
            Submission.user_id == user_id,
            Submission.task_id == task_id,
            Submission.status.in_(_ACTIVE_SUB_STATUSES),
        )
    )


def _get_progress(db: Session, user_id: int, task_id: int) -> UserTaskProgress | None:
    return db.scalar(
        select(UserTaskProgress).where(
            UserTaskProgress.user_id == user_id,
            UserTaskProgress.task_id == task_id,
        )
    )


def _avg_score(db: Session, submission_id: int) -> float | None:
    from app.models.evaluation import EvaluationResponse, RubricItem
    scores = db.scalars(
        select(EvaluationResponse.value_scale).where(
            EvaluationResponse.evaluation_id.in_(
                select(Evaluation.id).where(
                    Evaluation.submission_id == submission_id,
                    Evaluation.status.in_(
                        [EvaluationStatus.SUBMITTED, EvaluationStatus.CONFIRMED]
                    ),
                )
            ),
            EvaluationResponse.value_scale.isnot(None),
        )
    ).all()
    return round(sum(scores) / len(scores), 2) if scores else None


def _build_project_read(
    task: Task,
    progress: UserTaskProgress | None,
    latest_sub: Submission | None,
) -> ProjectRead:
    status = _user_status(progress, latest_sub)
    grade: float | None = None
    if latest_sub and latest_sub.status == SubmissionStatus.COMPLETED:
        # try avg rubric score first; fall back to overall_pass → 4 or 2
        from sqlalchemy.orm import object_session
        db = object_session(task)
        grade = _avg_score(db, latest_sub.id)
        if grade is None:
            ev = db.scalar(
                select(Evaluation).where(
                    Evaluation.submission_id == latest_sub.id,
                    Evaluation.status == EvaluationStatus.CONFIRMED,
                )
            )
            if ev is not None:
                grade = 4.0 if ev.overall_pass else 2.0

    return ProjectRead(
        id=task.id,
        title=task.title,
        description=task.description,
        category=task.category,
        difficulty=task.difficulty,
        xp_reward=task.xp_reward,
        estimated_time=task.estimated_time,
        tools=task.tools or [],
        position=task.position,
        status=task.status,
        user_status=status,
        my_notes=progress.notes if progress else "",
        my_latest_submission_id=latest_sub.id if latest_sub else None,
        my_grade=grade,
    )


def _log_exercise_submitted_for_review(
    db: Session, user: User, sub: Submission, *, content_length: int | None = None
) -> None:
    task = db.get(Task, sub.task_id)
    task_title = task.title if task else f"task #{sub.task_id}"
    label = display_user(user)
    length = content_length if content_length is not None else len(sub.content or "")
    attempt = sub.attempt_number
    log_user_journey(
        logger,
        "user_submitted_exercise",
        f"User {label} submitted their work on \"{task_title}\" (attempt {attempt}).",
        user_id=user.id,
        task_id=sub.task_id,
        submission_id=sub.id,
        attempt=attempt,
        content_length=length,
    )
    log_user_journey(
        logger,
        "user_requested_peer_review",
        f"User {label} requested peer review for \"{task_title}\".",
        user_id=user.id,
        task_id=sub.task_id,
        submission_id=sub.id,
        attempt=attempt,
    )
    matching.log_evaluation_slot_ready(db, sub)


# ── list + detail ──────────────────────────────────────────────────────────

@router.get("", response_model=list[ProjectRead])
def list_projects(
    status: str | None = Query(default=None),
    category: str | None = Query(default=None),
    tool: str | None = Query(default=None),
    q: str | None = Query(default=None),
    include_hidden: bool = Query(default=False),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[ProjectRead]:
    privileged = user.role in (UserRole.POWER_USER, UserRole.ADMIN)
    stmt = select(Task)
    if not (privileged and include_hidden):
        stmt = stmt.where(Task.status == TaskStatus.VISIBLE)
    if category:
        stmt = stmt.where(Task.category == category)
    if q:
        stmt = stmt.where(Task.title.ilike(f"%{q}%"))
    tasks = db.scalars(stmt.order_by(Task.position, Task.id)).all()
    task_ids = [t.id for t in tasks]

    # Bulk-load progress + latest submission per (user, task) to avoid N+1.
    progress_map: dict[int, UserTaskProgress] = {}
    latest_sub_map: dict[int, Submission] = {}
    if task_ids:
        progress_map = {
            p.task_id: p
            for p in db.scalars(
                select(UserTaskProgress).where(
                    UserTaskProgress.user_id == user.id,
                    UserTaskProgress.task_id.in_(task_ids),
                )
            ).all()
        }
        # latest submission per task = highest attempt_number per task_id.
        sub_rows = db.scalars(
            select(Submission)
            .where(
                Submission.user_id == user.id,
                Submission.task_id.in_(task_ids),
            )
            .order_by(Submission.task_id, Submission.attempt_number.desc())
        ).all()
        for s in sub_rows:
            if s.task_id not in latest_sub_map:
                latest_sub_map[s.task_id] = s

    result = []
    for task in tasks:
        progress = progress_map.get(task.id)
        latest_sub = latest_sub_map.get(task.id)
        proj = _build_project_read(task, progress, latest_sub)
        # filter by user_status after building
        if status and proj.user_status != status:
            continue
        # filter by tool
        if tool and tool not in (task.tools or []):
            continue
        result.append(proj)
    return result


@router.get("/{task_id}", response_model=ProjectDetail)
def get_project(
    task_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ProjectDetail:
    task = db.get(Task, task_id)
    privileged = user.role in (UserRole.POWER_USER, UserRole.ADMIN)
    if task is None or (task.status == TaskStatus.HIDDEN and not privileged):
        raise HTTPException(status_code=404, detail="Project not found")
    progress = _get_progress(db, user.id, task_id)
    latest_sub = _latest_sub(db, user.id, task_id)
    base = _build_project_read(task, progress, latest_sub)
    label = display_user(user)
    log_user_journey(
        logger,
        "user_opened_exercise",
        f"User {label} opened the exercise \"{task.title}\".",
        user_id=user.id,
        task_id=task_id,
        user_status=base.user_status,
        has_progress=progress is not None,
    )
    return ProjectDetail(
        **base.model_dump(),
        instructions=task.instructions,
        evaluator_guide=task.evaluator_guide,
        created_at=task.created_at,
    )


@router.get("/{task_id}/brief", response_model=ProjectBrief)
def get_brief(
    task_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ProjectBrief:
    task = db.get(Task, task_id)
    if task is None or task.status == TaskStatus.HIDDEN:
        raise HTTPException(status_code=404, detail="Project not found")
    return ProjectBrief.model_validate(task)


# ── lifecycle actions ──────────────────────────────────────────────────────

@router.post("/{task_id}/start", response_model=ProjectStartResponse, status_code=201)
def start_project(
    task_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ProjectStartResponse:
    task = db.get(Task, task_id)
    if task is None or task.status == TaskStatus.HIDDEN:
        raise HTTPException(status_code=404, detail="Project not found")

    progress = _get_progress(db, user.id, task_id)
    label = display_user(user)
    if progress is not None:
        log_user_journey(
            logger,
            "user_resumed_exercise",
            f"User {label} resumed the exercise \"{task.title}\".",
            level=logging.DEBUG,
            user_id=user.id,
            task_id=task_id,
            started_at=progress.started_at.isoformat() if progress.started_at else "-",
        )
        # Already started — idempotent
        return ProjectStartResponse(
            project_id=task_id,
            user_status=_user_status(progress, _latest_sub(db, user.id, task_id)),
            started_at=progress.started_at,
        )

    progress = UserTaskProgress(user_id=user.id, task_id=task_id, notes="")
    db.add(progress)
    db.commit()
    db.refresh(progress)
    log_user_journey(
        logger,
        "user_started_exercise",
        f"User {label} started the exercise \"{task.title}\".",
        user_id=user.id,
        task_id=task_id,
        started_at=progress.started_at.isoformat() if progress.started_at else "-",
    )
    return ProjectStartResponse(
        project_id=task_id,
        user_status="doing",
        started_at=progress.started_at,
    )


@router.patch("/{task_id}/notes", response_model=dict)
def update_notes(
    task_id: int,
    data: ProjectNotesUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    task = db.get(Task, task_id)
    if task is None or task.status == TaskStatus.HIDDEN:
        raise HTTPException(status_code=404, detail="Project not found")

    progress = _get_progress(db, user.id, task_id)
    auto_started = progress is None
    if progress is None:
        # Auto-start if the user saves notes without clicking Start
        progress = UserTaskProgress(user_id=user.id, task_id=task_id, notes=data.notes)
        db.add(progress)
    else:
        progress.notes = data.notes
    db.commit()
    label = display_user(user)
    task = db.get(Task, task_id)
    task_title = task.title if task else f"task #{task_id}"
    if auto_started:
        log_user_journey(
            logger,
            "user_started_exercise",
            f"User {label} started the exercise \"{task_title}\" by saving notes.",
            user_id=user.id,
            task_id=task_id,
            source="notes_auto_start",
        )
    log_user_journey(
        logger,
        "user_saved_notes",
        f"User {label} saved notes for \"{task_title}\" ({len(data.notes)} characters).",
        user_id=user.id,
        task_id=task_id,
        notes_length=len(data.notes),
        auto_started=auto_started,
    )
    return {"project_id": task_id, "notes": data.notes}


@router.post("/{task_id}/submit", response_model=ProjectSubmitResponse, status_code=201)
def submit_project(
    task_id: int,
    data: ProjectSubmitRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ProjectSubmitResponse:
    task = db.get(Task, task_id)
    if task is None or task.status == TaskStatus.HIDDEN:
        raise HTTPException(status_code=404, detail="Project not found")

    # Ensure there's a progress row
    progress = _get_progress(db, user.id, task_id)
    if progress is None:
        progress = UserTaskProgress(user_id=user.id, task_id=task_id, notes="")
        db.add(progress)
        db.flush()

    content = data.notes if data.notes is not None else (progress.notes or "—")

    existing = _active_sub(db, user.id, task_id)
    if existing is not None:
        if existing.status == SubmissionStatus.DRAFT:
            existing.content = content
            existing.status = SubmissionStatus.READY
            db.commit()
            db.refresh(existing)
            _log_exercise_submitted_for_review(
                db, user, existing, content_length=len(content)
            )
            return ProjectSubmitResponse(
                project_id=task_id,
                submission_id=existing.id,
                user_status="submitted",
            )
        # Already READY or MATCHED — idempotent
        logger.debug(
            "event=project_submit_idempotent user_id=%s task_id=%s submission_id=%s status=%s",
            user.id,
            task_id,
            existing.id,
            existing.status.value,
        )
        return ProjectSubmitResponse(
            project_id=task_id,
            submission_id=existing.id,
            user_status="submitted",
        )

    # Create a new submission and immediately mark READY
    last = db.scalar(
        select(func.max(Submission.attempt_number)).where(
            Submission.user_id == user.id, Submission.task_id == task_id
        )
    )
    sub = Submission(
        user_id=user.id,
        task_id=task_id,
        content=content,
        attempt_number=(last or 0) + 1,
        status=SubmissionStatus.READY,
    )
    db.add(sub)
    db.commit()
    db.refresh(sub)
    _log_exercise_submitted_for_review(db, user, sub, content_length=len(content))
    return ProjectSubmitResponse(
        project_id=task_id,
        submission_id=sub.id,
        user_status="submitted",
    )


@router.post("/{task_id}/retry", response_model=ProjectStartResponse, status_code=201)
def retry_project(
    task_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ProjectStartResponse:
    task = db.get(Task, task_id)
    if task is None or task.status == TaskStatus.HIDDEN:
        raise HTTPException(status_code=404, detail="Project not found")

    # Only allow retry if last submission is COMPLETED
    latest = _latest_sub(db, user.id, task_id)
    if latest is None or latest.status != SubmissionStatus.COMPLETED:
        raise HTTPException(
            status_code=409,
            detail="Can only retry a completed project",
        )

    # Reset notes so the user starts fresh (or keep — keep for convenience)
    progress = _get_progress(db, user.id, task_id)
    if progress:
        progress.notes = ""
        db.commit()

    logger.info(
        "event=project_retry user_id=%s task_id=%s previous_submission_id=%s",
        user.id,
        task_id,
        latest.id,
    )
    import datetime as dt
    return ProjectStartResponse(
        project_id=task_id,
        user_status="doing",
        started_at=progress.started_at if progress else dt.datetime.utcnow(),
    )


# ── admin / power-user CRUD (mirrors /tasks) ──────────────────────────────

@router.post("/admin", response_model=TaskRead, status_code=201)
def create_project(
    data: TaskCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_power_user),
) -> Task:
    task = Task(**data.model_dump(), created_by=user.id)
    db.add(task)
    db.commit()
    db.refresh(task)
    logger.info(
        "event=project_admin_create task_id=%s created_by=%s title=%s",
        task.id,
        user.id,
        task.title,
    )
    return task


@router.patch("/admin/{task_id}", response_model=TaskRead)
def update_project(
    task_id: int,
    data: TaskUpdate,
    db: Session = Depends(get_db),
    _user: User = Depends(require_power_user),
) -> Task:
    task = db.get(Task, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Project not found")
    fields = data.model_dump(exclude_unset=True)
    for field, value in fields.items():
        setattr(task, field, value)
    db.commit()
    db.refresh(task)
    logger.info(
        "event=project_admin_update task_id=%s fields=%s",
        task_id,
        ",".join(fields.keys()),
    )
    return task
