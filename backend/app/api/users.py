"""User profile and settings endpoints.

GET  /users/me          — full profile
PATCH /users/me         — update name / department / avatar
GET  /users/me/settings — UI preferences
PATCH /users/me/settings
GET  /users/me/stats    — XP, level, streak, project/eval counts
GET  /users/me/badges   — earned badges
GET  /users/me/activity — recent activity feed

Admin:
GET  /users             — paginated user list
PATCH /users/{id}/role  — promote / demote
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import delete, func, or_, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_admin
from app.core.db import get_db
from app.core.logging import display_user, get_logger, log_user_journey
from app.models import (
    Evaluation,
    EvaluationResponse,
    Notification,
    Submission,
    User,
    UserAvailability,
    UserBadge,
    UserTaskProgress,
)
from app.models.enums import EvaluationStatus, SubmissionStatus, UserRole
from app.schemas.auth import BadgeRead, MessageResponse, RoleUpdate, UserRead
from app.schemas.notification import NotificationRead
from app.schemas.user import ActivityItem, UserMe, UserSettings, UserSettingsPatch, UserStats, UserUpdate
from app.services.gamification import BADGE_REGISTRY, XP_PER_LEVEL, get_level
from app.services.project_progress import count_tasks_by_user_status

router = APIRouter(prefix="/users", tags=["users"])
logger = get_logger(__name__)


def _initials(user: User) -> str:
    if user.name:
        parts = user.name.split()
        return "".join(p[0] for p in parts if p)[:2].upper()
    return user.email[:2].upper()


def _get_level(user: User) -> int:
    return get_level(user.xp)


@router.get("/me", response_model=UserRead)
def me(user: User = Depends(get_current_user)) -> User:
    return user


@router.patch("/me", response_model=UserRead)
def update_me(
    data: UserUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> User:
    fields = data.model_dump(exclude_unset=True)
    old_department = user.department
    for field, value in fields.items():
        setattr(user, field, value)
    db.commit()
    db.refresh(user)
    label = display_user(user)
    if "department" in fields:
        dept = fields["department"] or "-"
        prev = old_department or "-"
        if prev == "-":
            desc = f"User {label} selected {dept} as their department."
        else:
            desc = f"User {label} changed their department from {prev} to {dept}."
        log_user_journey(
            logger,
            "user_department_selected",
            desc,
            user_id=user.id,
            department=dept,
            previous_department=prev,
            source="profile",
        )
    other_fields = [k for k in fields if k != "department"]
    if other_fields:
        field_list = ", ".join(other_fields)
        log_user_journey(
            logger,
            "user_profile_updated",
            f"User {label} updated their profile ({field_list}).",
            user_id=user.id,
            fields=",".join(other_fields),
        )
    return user


def _settings_from_user(user: User) -> UserSettings:
    s = user.settings or {}
    return UserSettings(
        theme=s.get("theme", "dark"),
        language=s.get("language", "en"),
        accent=s.get("accent", "#0ea5b5"),
        onboarding_completed=bool(s.get("onboarding_completed", False)),
        ai_base_url=s.get("ai_base_url") or None,
    )


@router.get("/me/settings", response_model=UserSettings)
def get_settings(user: User = Depends(get_current_user)) -> UserSettings:
    return _settings_from_user(user)


@router.patch("/me/settings", response_model=UserSettings)
def update_settings(
    data: UserSettingsPatch,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> UserSettings:
    patch = data.model_dump(exclude_unset=True)
    merged = {**(user.settings or {}), **patch}
    user.settings = merged
    db.commit()
    label = display_user(user)
    changed = ", ".join(patch.keys())
    theme = merged.get("theme", "dark")
    language = merged.get("language", "en")
    if patch.get("onboarding_completed"):
        desc = f"User {label} completed onboarding and saved their preferences."
    else:
        desc = f"User {label} updated their preferences ({changed})."
    log_user_journey(
        logger,
        "user_preferences_updated",
        desc,
        user_id=user.id,
        theme=theme,
        language=language,
        accent=merged.get("accent", "#0ea5b5"),
        onboarding_completed=bool(merged.get("onboarding_completed", False)),
        changed_keys=changed,
    )
    return _settings_from_user(user)


@router.post("/me/reset-progress", response_model=MessageResponse)
def reset_progress(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> MessageResponse:
    """Clear learning progress for the current user (demo / testing)."""
    sub_ids = list(
        db.scalars(select(Submission.id).where(Submission.user_id == user.id)).all()
    )
    eval_conditions = [
        Evaluation.evaluator_id == user.id,
        Evaluation.evaluatee_id == user.id,
    ]
    if sub_ids:
        eval_conditions.append(Evaluation.submission_id.in_(sub_ids))
    eval_ids = select(Evaluation.id).where(or_(*eval_conditions))

    db.execute(
        delete(EvaluationResponse).where(EvaluationResponse.evaluation_id.in_(eval_ids))
    )
    db.execute(delete(Evaluation).where(Evaluation.id.in_(eval_ids)))
    db.execute(delete(Submission).where(Submission.user_id == user.id))
    db.execute(delete(UserTaskProgress).where(UserTaskProgress.user_id == user.id))
    db.execute(delete(UserBadge).where(UserBadge.user_id == user.id))
    db.execute(delete(Notification).where(Notification.user_id == user.id))

    avail = db.scalar(
        select(UserAvailability).where(UserAvailability.user_id == user.id)
    )
    if avail is not None:
        avail.slots = {}

    user.xp = 0
    user.streak = 0
    settings = dict(user.settings or {})
    settings["onboarding_completed"] = False
    user.settings = settings

    db.commit()
    logger.warning(
        "event=user_progress_reset user_id=%s submissions_cleared=%s",
        user.id,
        len(sub_ids),
    )
    return MessageResponse(message="Progress reset. Onboarding will show again.")


@router.get("/me/stats", response_model=UserStats)
def my_stats(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> UserStats:
    projects_done = count_tasks_by_user_status(
        db,
        user.id,
        {"completed", "submitted"},
        general_curriculum_only=True,
    )
    projects_awaiting_eval = count_tasks_by_user_status(
        db,
        user.id,
        {"submitted"},
        general_curriculum_only=True,
    )
    projects_wip = count_tasks_by_user_status(
        db,
        user.id,
        {"doing"},
        general_curriculum_only=True,
    )
    evals_given = db.scalar(
        select(func.count()).select_from(Evaluation).where(
            Evaluation.evaluator_id == user.id,
            Evaluation.status.in_(
                [EvaluationStatus.SUBMITTED, EvaluationStatus.CONFIRMED]
            ),
        )
    ) or 0
    evals_received = db.scalar(
        select(func.count()).select_from(Evaluation).where(
            Evaluation.evaluatee_id == user.id,
            Evaluation.status.in_(
                [EvaluationStatus.SUBMITTED, EvaluationStatus.CONFIRMED]
            ),
        )
    ) or 0
    lvl = get_level(user.xp)
    xp_to_next = XP_PER_LEVEL - (user.xp % XP_PER_LEVEL)
    return UserStats(
        projects_done=projects_done,
        projects_awaiting_eval=projects_awaiting_eval,
        projects_in_progress=projects_wip,
        evals_given=evals_given,
        evals_received=evals_received,
        streak=user.streak,
        xp=user.xp,
        level=lvl,
        xp_to_next_level=xp_to_next,
    )


@router.get("/me/badges", response_model=list[BadgeRead])
def my_badges(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[BadgeRead]:
    rows = db.scalars(
        select(UserBadge).where(UserBadge.user_id == user.id)
    ).all()
    return [
        BadgeRead(
            code=row.code,
            name=BADGE_REGISTRY.get(row.code, {}).get("name", row.code),
            description=BADGE_REGISTRY.get(row.code, {}).get("description", ""),
            earned_at=row.earned_at,
        )
        for row in rows
    ]


@router.get("/me/activity", response_model=list[ActivityItem])
def my_activity(
    limit: int = Query(default=20, le=50),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[ActivityItem]:
    """Derive recent activity from evaluations, submissions, and notifications."""
    items: list[ActivityItem] = []

    # Completed submissions → XP earned
    for sub in db.scalars(
        select(Submission).where(
            Submission.user_id == user.id,
            Submission.status == SubmissionStatus.COMPLETED,
        ).order_by(Submission.updated_at.desc()).limit(limit)
    ).all():
        items.append(ActivityItem(
            id=sub.id,
            kind="submission_completed",
            label=f"Project completed",
            xp_delta=None,
            created_at=sub.updated_at,
        ))

    # Evaluations submitted
    for ev in db.scalars(
        select(Evaluation).where(
            Evaluation.evaluator_id == user.id,
            Evaluation.status.in_(
                [EvaluationStatus.SUBMITTED, EvaluationStatus.CONFIRMED]
            ),
        ).order_by(Evaluation.submitted_at.desc()).limit(limit)
    ).all():
        items.append(ActivityItem(
            id=ev.id,
            kind="eval_submitted",
            label="Peer evaluation submitted",
            xp_delta=50,
            created_at=ev.submitted_at or ev.created_at,
        ))

    # Badges
    for badge in db.scalars(
        select(UserBadge).where(UserBadge.user_id == user.id)
        .order_by(UserBadge.earned_at.desc()).limit(limit)
    ).all():
        name = BADGE_REGISTRY.get(badge.code, {}).get("name", badge.code)
        items.append(ActivityItem(
            id=badge.id,
            kind="badge_earned",
            label=f"Badge unlocked: {name}",
            xp_delta=None,
            created_at=badge.earned_at,
        ))

    items.sort(key=lambda x: x.created_at, reverse=True)
    return items[:limit]


# ── Dashboard (kept for backwards compat) ──────────────────────────────────

@router.get("/dashboard")
def dashboard(
    db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> dict:
    from app.schemas.auth import BadgeRead, DashboardRead
    rows = db.scalars(select(UserBadge).where(UserBadge.user_id == user.id)).all()
    badges = [
        BadgeRead(
            code=row.code,
            name=BADGE_REGISTRY.get(row.code, {}).get("name", row.code),
            description=BADGE_REGISTRY.get(row.code, {}).get("description", ""),
            earned_at=row.earned_at,
        )
        for row in rows
    ]
    return DashboardRead(id=user.id, email=user.email, role=user.role, xp=user.xp, badges=badges)


# ── Admin ──────────────────────────────────────────────────────────────────

@router.get("", response_model=list[UserRead])
def list_users(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> list[User]:
    offset = (page - 1) * page_size
    return list(
        db.scalars(select(User).order_by(User.id).offset(offset).limit(page_size))
    )


@router.patch("/{user_id}/role", response_model=UserRead)
def update_role(
    user_id: int,
    data: RoleUpdate,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> User:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    old_role = user.role
    user.role = data.role
    db.commit()
    db.refresh(user)
    logger.info(
        "event=user_role_updated target_user_id=%s old_role=%s new_role=%s",
        user_id,
        old_role,
        data.role,
    )
    return user
