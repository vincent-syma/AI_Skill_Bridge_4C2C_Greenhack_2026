"""Task endpoints.

Reading requires auth (so we can attach the caller's progress) and is open
to any role. Regular users only ever see VISIBLE tasks; power users/admins
can pass include_hidden=true to also see retired ones for management.
A hidden task is a 404 to a regular user -- we don't reveal it exists.

Creating, editing, and hiding are gated behind require_power_user. There is
no delete: retiring a task means PATCH status=hidden, which is reversible and
preserves every submission tied to it.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_power_user
from app.core.db import get_db
from app.core.logging import display_user, get_logger, log_user_journey
from app.models import Submission, Task, User
from app.models.enums import TaskStatus, UserRole
from app.schemas.task import TaskCreate, TaskRead, TaskUpdate, TaskWithProgress

router = APIRouter(prefix="/tasks", tags=["tasks"])
logger = get_logger(__name__)


def _is_privileged(user: User) -> bool:
    return user.role in (UserRole.POWER_USER, UserRole.ADMIN)


def _progress(db: Session, user_id: int, task_ids: list[int]):
    """Return {task_id: latest_submission} and {task_id: attempt_count}."""
    if not task_ids:
        return {}, {}
    rows = db.scalars(
        select(Submission).where(
            Submission.user_id == user_id,
            Submission.task_id.in_(task_ids),
        )
    ).all()
    latest: dict[int, Submission] = {}
    counts: dict[int, int] = {}
    for s in rows:
        counts[s.task_id] = counts.get(s.task_id, 0) + 1
        cur = latest.get(s.task_id)
        if cur is None or s.attempt_number > cur.attempt_number:
            latest[s.task_id] = s
    return latest, counts


def _with_progress(task: Task, latest, counts) -> TaskWithProgress:
    out = TaskWithProgress.model_validate(task)
    s = latest.get(task.id)
    out.my_status = s.status if s else None
    out.my_attempts = counts.get(task.id, 0)
    out.my_latest_submission_id = s.id if s else None
    return out


@router.get("", response_model=list[TaskWithProgress])
def list_tasks(
    include_hidden: bool = Query(False),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[TaskWithProgress]:
    stmt = select(Task)
    if not (_is_privileged(user) and include_hidden):
        stmt = stmt.where(Task.status == TaskStatus.VISIBLE)
    tasks = db.scalars(stmt.order_by(Task.position, Task.id)).all()
    latest, counts = _progress(db, user.id, [t.id for t in tasks])
    return [_with_progress(t, latest, counts) for t in tasks]


@router.get("/{task_id}", response_model=TaskWithProgress)
def get_task(
    task_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> TaskWithProgress:
    task = db.get(Task, task_id)
    if task is None or (
        task.status == TaskStatus.HIDDEN and not _is_privileged(user)
    ):
        raise HTTPException(status_code=404, detail="Task not found")
    latest, counts = _progress(db, user.id, [task.id])
    result = _with_progress(task, latest, counts)
    label = display_user(user)
    status_label = result.my_status.value if result.my_status else "not started"
    log_user_journey(
        logger,
        "user_opened_exercise",
        f"User {label} opened the exercise \"{task.title}\".",
        user_id=user.id,
        task_id=task.id,
        my_status=status_label,
        source="tasks_api",
    )
    return result


@router.post("", response_model=TaskRead, status_code=201)
def create_task(
    data: TaskCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_power_user),
) -> Task:
    task = Task(**data.model_dump(), created_by=user.id)
    db.add(task)
    db.commit()
    db.refresh(task)
    logger.info(
        "event=task_created task_id=%s created_by=%s title=%s required_evaluations=%s xp_reward=%s",
        task.id,
        user.id,
        task.title,
        task.required_evaluations,
        task.xp_reward,
    )
    return task


@router.patch("/{task_id}", response_model=TaskRead)
def update_task(
    task_id: int,
    data: TaskUpdate,
    db: Session = Depends(get_db),
    _user: User = Depends(require_power_user),
) -> Task:
    task = db.get(Task, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(task, field, value)
    db.commit()
    db.refresh(task)
    logger.info(
        "event=task_updated task_id=%s fields=%s status=%s",
        task.id,
        ",".join(sorted(data.model_dump(exclude_unset=True).keys())),
        task.status.value,
    )
    return task
