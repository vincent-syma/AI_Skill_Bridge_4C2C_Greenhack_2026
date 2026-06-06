"""Gamification service: XP, levels, badges.

XP is awarded on two fixed events:
  EVAL_XP   (+50)  when an evaluator submits their evaluation form
  task.xp_reward   when the evaluatee's submission reaches COMPLETED

Level = xp // XP_PER_LEVEL  (linear, configurable constant).

Badges are triggered by both event counts and XP milestones. Definitions
live here in BADGE_REGISTRY rather than a DB table -- add a badge by adding
an entry; it gets granted retroactively on the next grant_xp call.

grant_xp and check_and_grant_badges do NOT commit. They are called within
an existing transaction (the evaluation service's transaction) so everything
-- XP change, badge rows, evaluation status, submission status -- lands in
one atomic commit.
"""
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.logging import get_logger
from app.models import Evaluation, Submission, UserBadge, User
from app.models.enums import EvaluationStatus, SubmissionStatus
from app.services.project_progress import count_completed_tasks

logger = get_logger(__name__)

EVAL_XP: int = 50
XP_PER_LEVEL: int = 500

BADGE_REGISTRY: dict[str, dict] = {
    # --- event-based ---
    "FIRST_SUBMISSION": {
        "name": "First Step",
        "description": "Marked your first submission ready for review.",
    },
    "FIRST_EVAL": {
        "name": "Peer Helper",
        "description": "Submitted your first peer evaluation.",
    },
    "EVAL_5": {
        "name": "Reviewer",
        "description": "Submitted 5 peer evaluations.",
    },
    "EVAL_10": {
        "name": "Expert Reviewer",
        "description": "Submitted 10 peer evaluations.",
    },
    "TASK_COMPLETE": {
        "name": "Graduate",
        "description": "Completed your first learning task.",
    },
    "TASK_5": {
        "name": "AI Champion",
        "description": "Completed 5 learning tasks.",
    },
    # --- milestone-based (XP thresholds) ---
    "LEVEL_1": {"name": "Rising", "description": "Reached level 1."},
    "LEVEL_5": {"name": "Pro", "description": "Reached level 5."},
    "LEVEL_10": {"name": "Legend", "description": "Reached level 10."},
}


def get_level(xp: int) -> int:
    return xp // XP_PER_LEVEL


def _deserved_codes(db: Session, user: User) -> set[str]:
    """Compute the full set of badge codes this user should have right now."""
    codes: set[str] = set()

    ready = db.scalar(
        select(func.count()).select_from(Submission).where(
            Submission.user_id == user.id,
            Submission.status != SubmissionStatus.DRAFT,
        )
    ) or 0
    if ready >= 1:
        codes.add("FIRST_SUBMISSION")

    completed = count_completed_tasks(db, user.id)
    if completed >= 1:
        codes.add("TASK_COMPLETE")
    if completed >= 5:
        codes.add("TASK_5")

    evals = db.scalar(
        select(func.count()).select_from(Evaluation).where(
            Evaluation.evaluator_id == user.id,
            Evaluation.status.in_(
                [EvaluationStatus.SUBMITTED, EvaluationStatus.CONFIRMED]
            ),
        )
    ) or 0
    if evals >= 1:
        codes.add("FIRST_EVAL")
    if evals >= 5:
        codes.add("EVAL_5")
    if evals >= 10:
        codes.add("EVAL_10")

    lvl = get_level(user.xp)
    if lvl >= 1:
        codes.add("LEVEL_1")
    if lvl >= 5:
        codes.add("LEVEL_5")
    if lvl >= 10:
        codes.add("LEVEL_10")

    return codes


def check_and_grant_badges(db: Session, user: User) -> list[str]:
    """Grant any newly deserved badges. Returns the newly granted codes."""
    already = set(
        db.scalars(
            select(UserBadge.code).where(UserBadge.user_id == user.id)
        ).all()
    )
    new_codes = _deserved_codes(db, user) - already
    for code in new_codes:
        if code in BADGE_REGISTRY:
            db.add(UserBadge(user_id=user.id, code=code))
    if new_codes:
        logger.info(
            "event=badges_granted user_id=%s badges=%s xp=%s level=%s",
            user.id,
            ",".join(sorted(new_codes)),
            user.xp,
            get_level(user.xp),
        )
    else:
        logger.debug(
            "event=badges_checked user_id=%s new_badges=0 xp=%s level=%s",
            user.id,
            user.xp,
            get_level(user.xp),
        )
    return list(new_codes)


def grant_xp(db: Session, user: User, amount: int) -> None:
    """Add XP and check for newly unlocked badges. Does not commit."""
    previous_xp = user.xp
    previous_level = get_level(previous_xp)
    user.xp += amount
    new_level = get_level(user.xp)
    check_and_grant_badges(db, user)
    logger.info(
        "event=xp_granted user_id=%s amount=%s xp_before=%s xp_after=%s level_before=%s level_after=%s",
        user.id,
        amount,
        previous_xp,
        user.xp,
        previous_level,
        new_level,
    )
