"""Submission endpoints (the employee side).

Lifecycle: create a DRAFT (text required, file optional) -> edit it freely
-> mark it READY, which locks it and puts it in the matching pool. Redoing
a task means a brand-new attempt, not editing a locked one.

Invariant enforced here: a user has at most ONE *active* submission per task
at a time, where active = DRAFT | READY | MATCHED. COMPLETED submissions are
history and don't block a new attempt.
"""
import shutil
import uuid
from pathlib import Path

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    UploadFile,
)
from fastapi.responses import FileResponse
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.db import get_db
from app.core.logging import display_user, get_logger, log_user_journey
from app.models import Evaluation, Submission, Task, User
from app.models.enums import SubmissionStatus, TaskStatus, UserRole
from app.schemas.submission import SubmissionRead
from app.services import matching

router = APIRouter(prefix="/submissions", tags=["submissions"])
logger = get_logger(__name__)

ACTIVE = (
    SubmissionStatus.DRAFT,
    SubmissionStatus.READY,
    SubmissionStatus.MATCHED,
)


def _save_upload(file: UploadFile) -> tuple[str, str]:
    """Stream an upload to disk. Returns (stored_path, original_name).

    The filename is reduced to its basename and prefixed with a UUID so a
    malicious name can't escape the upload dir or collide with another file.
    (No size cap by request; a max-bytes guard would slot in right here.)
    """
    upload_dir = Path(settings.upload_dir)
    upload_dir.mkdir(parents=True, exist_ok=True)
    original = Path(file.filename or "upload").name
    stored = upload_dir / f"{uuid.uuid4().hex}_{original}"
    with stored.open("wb") as out:
        shutil.copyfileobj(file.file, out)
    logger.debug(
        "event=submission_file_saved stored_path=%s original_name=%s size_bytes=%s",
        stored,
        original,
        stored.stat().st_size,
    )
    return str(stored), original


def _owned_draft(db: Session, sub_id: int, user: User) -> Submission:
    sub = db.get(Submission, sub_id)
    if sub is None or sub.user_id != user.id:
        raise HTTPException(status_code=404, detail="Submission not found")
    if sub.status != SubmissionStatus.DRAFT:
        raise HTTPException(
            status_code=409, detail="Submission is locked (already submitted)"
        )
    return sub


@router.post("", response_model=SubmissionRead, status_code=201)
def create_draft(
    task_id: int = Form(...),
    content: str = Form(..., min_length=1),
    file: UploadFile | None = File(None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Submission:
    task = db.get(Task, task_id)
    if task is None or task.status == TaskStatus.HIDDEN:
        raise HTTPException(status_code=404, detail="Task not found")

    active = db.scalar(
        select(Submission).where(
            Submission.user_id == user.id,
            Submission.task_id == task_id,
            Submission.status.in_(ACTIVE),
        )
    )
    if active is not None:
        raise HTTPException(
            status_code=409,
            detail="You already have an active submission for this task",
        )

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
    )
    if file is not None:
        sub.file_path, sub.file_name = _save_upload(file)
    db.add(sub)
    db.commit()
    db.refresh(sub)
    logger.info(
        "event=submission_draft_created submission_id=%s user_id=%s task_id=%s attempt=%s has_file=%s content_length=%s",
        sub.id,
        user.id,
        task_id,
        sub.attempt_number,
        sub.file_path is not None,
        len(content),
    )
    return sub


@router.patch("/{sub_id}", response_model=SubmissionRead)
def edit_draft(
    sub_id: int,
    content: str | None = Form(None),
    file: UploadFile | None = File(None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Submission:
    sub = _owned_draft(db, sub_id, user)
    if content is not None:
        if not content.strip():
            raise HTTPException(status_code=422, detail="content cannot be empty")
        sub.content = content
    if file is not None:
        if sub.file_path:  # remove the old file so disk doesn't accumulate orphans
            Path(sub.file_path).unlink(missing_ok=True)
        sub.file_path, sub.file_name = _save_upload(file)
    db.commit()
    db.refresh(sub)
    logger.info(
        "event=submission_draft_updated submission_id=%s user_id=%s content_updated=%s file_updated=%s",
        sub.id,
        user.id,
        content is not None,
        file is not None,
    )
    return sub


@router.post("/{sub_id}/ready", response_model=SubmissionRead)
def mark_ready(
    sub_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Submission:
    sub = _owned_draft(db, sub_id, user)
    sub.status = SubmissionStatus.READY
    db.commit()
    db.refresh(sub)
    task = db.get(Task, sub.task_id)
    task_title = task.title if task else f"task #{sub.task_id}"
    label = display_user(user)
    log_user_journey(
        logger,
        "user_requested_peer_review",
        f"User {label} requested peer review for \"{task_title}\".",
        user_id=user.id,
        task_id=sub.task_id,
        submission_id=sub.id,
        attempt=sub.attempt_number,
        source="mark_ready",
    )
    log_user_journey(
        logger,
        "user_submitted_exercise",
        f"User {label} submitted their work on \"{task_title}\" (attempt {sub.attempt_number}).",
        user_id=user.id,
        task_id=sub.task_id,
        submission_id=sub.id,
        attempt=sub.attempt_number,
        source="mark_ready",
    )
    matching.log_evaluation_slot_ready(db, sub)
    return sub


@router.get("/mine", response_model=list[SubmissionRead])
def my_submissions(
    task_id: int | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[Submission]:
    stmt = select(Submission).where(Submission.user_id == user.id)
    if task_id is not None:
        stmt = stmt.where(Submission.task_id == task_id)
    return list(
        db.scalars(stmt.order_by(Submission.task_id, Submission.attempt_number))
    )


def _can_view(db: Session, viewer: User, sub: Submission) -> bool:
    if viewer.id == sub.user_id:
        return True
    if viewer.role in (UserRole.POWER_USER, UserRole.ADMIN):
        return True
    # A matched evaluator may view the submission they were assigned.
    assigned = db.scalar(
        select(Evaluation).where(
            Evaluation.evaluator_id == viewer.id,
            Evaluation.submission_id == sub.id,
        )
    )
    return assigned is not None


@router.get("/{sub_id}", response_model=SubmissionRead)
def get_submission(
    sub_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Submission:
    sub = db.get(Submission, sub_id)
    if sub is None or not _can_view(db, user, sub):
        raise HTTPException(status_code=404, detail="Submission not found")
    return sub


@router.get("/{sub_id}/file")
def download_file(
    sub_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> FileResponse:
    sub = db.get(Submission, sub_id)
    if sub is None or not _can_view(db, user, sub):
        raise HTTPException(status_code=404, detail="Submission not found")
    if not sub.file_path:
        raise HTTPException(status_code=404, detail="No file on this submission")
    logger.info(
        "event=submission_file_download submission_id=%s viewer_id=%s file_name=%s",
        sub.id,
        user.id,
        sub.file_name,
    )
    return FileResponse(sub.file_path, filename=sub.file_name)
