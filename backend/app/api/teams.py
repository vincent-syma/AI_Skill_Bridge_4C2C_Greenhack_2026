"""Teams API — /api/v1/teams (MVP stubs)."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.db import get_db
from app.core.logging import get_logger
from app.models import Submission, User
from app.models.enums import SubmissionStatus

router = APIRouter(prefix="/teams", tags=["teams"])
logger = get_logger(__name__)


@router.get("/me")
def my_team(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    """Return basic info about the user's department/team."""
    members = db.scalars(
        select(User).where(User.department == user.department).limit(20)
    ).all() if user.department else []
    logger.debug(
        "event=team_me user_id=%s department=%s member_count=%s",
        user.id,
        user.department,
        len(members),
    )
    return {
        "department": user.department,
        "members": [
            {"id": m.id, "name": m.name, "email": m.email, "xp": m.xp}
            for m in members
        ],
    }


@router.get("/me/stats")
def my_team_stats(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    dept_users = db.scalars(
        select(User).where(User.department == user.department)
    ).all() if user.department else []
    user_ids = [u.id for u in dept_users]
    total_xp = sum(u.xp for u in dept_users)
    completed = 0
    if user_ids:
        completed = db.scalar(
            select(func.count()).select_from(Submission).where(
                Submission.user_id.in_(user_ids),
                Submission.status == SubmissionStatus.COMPLETED,
            )
        ) or 0
    logger.debug(
        "event=team_stats user_id=%s department=%s member_count=%s combined_xp=%s projects_completed=%s",
        user.id,
        user.department,
        len(dept_users),
        total_xp,
        completed,
    )
    return {
        "department": user.department,
        "member_count": len(dept_users),
        "combined_xp": total_xp,
        "projects_completed": completed,
    }


@router.get("/peer-count")
def peer_count_for_department(
    department: str = Query(..., min_length=1, max_length=120),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    """Estimate how many colleagues share a department label (free-text friendly)."""
    dept = department.strip()
    exact = (
        db.scalar(
            select(func.count())
            .select_from(User)
            .where(func.lower(User.department) == dept.lower())
        )
        or 0
    )
    fuzzy = exact
    if exact <= 1:
        fuzzy = (
            db.scalar(
                select(func.count())
                .select_from(User)
                .where(User.department.ilike(f"%{dept}%"))
            )
            or 0
        )
    matched = max(exact, fuzzy)
    org_total = db.scalar(select(func.count()).select_from(User)) or 1
    # Workshop wow: if they're alone in that label, show org peers instead
    peer_count = matched if matched > 1 else max(org_total - 1, 1)
    logger.debug(
        "event=team_peer_count user_id=%s department=%s exact=%s fuzzy=%s peer_count=%s",
        user.id,
        dept,
        exact,
        fuzzy,
        peer_count,
    )
    return {
        "department": dept,
        "peer_count": peer_count,
        "exact_matches": exact,
    }
