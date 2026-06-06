"""Per-task project progress — same rules as GET /projects user_status.

count_completed_tasks: latest submission COMPLETED (peer eval finished).
Home projects_done uses completed + submitted via count_tasks_by_user_status.
"""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Submission, Task, UserTaskProgress
from app.models.enums import SubmissionStatus, TaskStatus

RISK_TRACK_TOOL = "track:risk-management"


def is_risk_curriculum_task(task: Task) -> bool:
    tools = task.tools or []
    if RISK_TRACK_TOOL in tools:
        return True
    return any(isinstance(t, str) and t.startswith("day:") for t in tools)


def user_status_from_latest(
    progress: UserTaskProgress | None,
    latest_sub: Submission | None,
) -> str:
    if latest_sub is None:
        return "not_started" if progress is None else "doing"
    if latest_sub.status == SubmissionStatus.COMPLETED:
        return "completed"
    if latest_sub.status in (SubmissionStatus.READY, SubmissionStatus.MATCHED):
        return "submitted"
    return "doing"


def _latest_sub(db: Session, user_id: int, task_id: int) -> Submission | None:
    return db.scalar(
        select(Submission)
        .where(Submission.user_id == user_id, Submission.task_id == task_id)
        .order_by(Submission.attempt_number.desc())
    )


def _get_progress(db: Session, user_id: int, task_id: int) -> UserTaskProgress | None:
    return db.scalar(
        select(UserTaskProgress).where(
            UserTaskProgress.user_id == user_id,
            UserTaskProgress.task_id == task_id,
        )
    )


def count_tasks_by_user_status(
    db: Session,
    user_id: int,
    statuses: set[str],
    *,
    general_curriculum_only: bool = False,
) -> int:
    tasks = db.scalars(select(Task).where(Task.status != TaskStatus.HIDDEN)).all()
    n = 0
    for task in tasks:
        if general_curriculum_only and is_risk_curriculum_task(task):
            continue
        progress = _get_progress(db, user_id, task.id)
        latest = _latest_sub(db, user_id, task.id)
        if user_status_from_latest(progress, latest) in statuses:
            n += 1
    return n


def count_completed_tasks(
    db: Session,
    user_id: int,
    *,
    general_curriculum_only: bool = False,
) -> int:
    return count_tasks_by_user_status(
        db,
        user_id,
        {"completed"},
        general_curriculum_only=general_curriculum_only,
    )
