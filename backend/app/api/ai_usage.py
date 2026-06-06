"""AI Usage API — /api/v1/ai-usage (MVP stubs returning computed data)."""
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.db import get_db
from app.core.logging import get_logger
from app.models import Submission, Task, User
from app.models.enums import SubmissionStatus

router = APIRouter(prefix="/ai-usage", tags=["ai-usage"])
logger = get_logger(__name__)


def _tool_breakdown(subs: list[Submission], db: Session) -> dict[str, int]:
    counts: dict[str, int] = {}
    for sub in subs:
        task = db.get(Task, sub.task_id)
        if task and task.tools:
            for tool in task.tools:
                counts[tool] = counts.get(tool, 0) + 1
    return counts


@router.get("/me")
def my_ai_usage(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    subs = db.scalars(
        select(Submission).where(
            Submission.user_id == user.id,
            Submission.status == SubmissionStatus.COMPLETED,
        )
    ).all()
    logger.debug(
        "event=ai_usage_me user_id=%s completed_projects=%s tool_count=%s",
        user.id,
        len(subs),
        len(_tool_breakdown(list(subs), db)),
    )
    return {
        "total_projects": len(subs),
        "tools": _tool_breakdown(list(subs), db),
    }


@router.get("/team")
def team_ai_usage(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    dept_users = db.scalars(
        select(User).where(User.department == user.department)
    ).all() if user.department else []
    user_ids = [u.id for u in dept_users]
    subs: list[Submission] = []
    if user_ids:
        subs = list(db.scalars(
            select(Submission).where(
                Submission.user_id.in_(user_ids),
                Submission.status == SubmissionStatus.COMPLETED,
            )
        ).all())
    tools = _tool_breakdown(subs, db)
    logger.debug(
        "event=ai_usage_team user_id=%s department=%s completed_projects=%s tool_count=%s",
        user.id,
        user.department,
        len(subs),
        len(tools),
    )
    return {
        "department": user.department,
        "total_projects": len(subs),
        "tools": tools,
    }
