"""Matching service: find and atomically claim evaluation slots.

The claim uses SELECT ... FOR UPDATE (SKIP LOCKED) on Postgres to prevent
two concurrent evaluators grabbing the last slot for the same submission --
the same concurrency primitive as the dining-philosophers mutex in Codexion,
just expressed in SQL. SQLite (used in tests) ignores the lock clause; all
other invariants still hold because the test runner is single-threaded.
"""
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.core.db import engine
from app.core.logging import display_user, get_logger, log_user_journey
from app.models import Evaluation, Submission, User
from app.models.enums import EvaluationStatus, EvaluatorEligibility, SubmissionStatus

logger = get_logger(__name__)

_ACTIVE_STATUSES = (EvaluationStatus.CLAIMED, EvaluationStatus.SUBMITTED)
_POOL_STATUSES = (SubmissionStatus.READY, SubmissionStatus.MATCHED)


def _active_eval_count(db: Session, submission_id: int) -> int:
    return db.scalar(
        select(func.count()).select_from(Evaluation).where(
            Evaluation.submission_id == submission_id,
            Evaluation.status.in_(_ACTIVE_STATUSES),
        )
    ) or 0


def log_evaluation_slot_ready(db: Session, sub: Submission) -> None:
    """Log when a submission enters the peer-review pool and needs evaluators."""
    from app.models import Task

    task = db.get(Task, sub.task_id)
    if task is None:
        logger.warning(
            "event=evaluation_slot_ready_skipped reason=task_missing submission_id=%s task_id=%s",
            sub.id,
            sub.task_id,
        )
        return
    active = _active_eval_count(db, sub.id)
    remaining = max(0, task.required_evaluations - active)
    evaluatee = db.get(User, sub.user_id)
    evaluatee_label = display_user(evaluatee, user_id=sub.user_id)
    log_user_journey(
        logger,
        "evaluation_slot_ready",
        f"Peer review is open for {evaluatee_label}'s submission on \"{task.title}\" ({remaining} evaluator slot(s) remaining).",
        submission_id=sub.id,
        task_id=sub.task_id,
        evaluatee_id=sub.user_id,
        active_evaluators=active,
        required_evaluators=task.required_evaluations,
        slots_remaining=remaining,
    )


def _eligible(db: Session, user: User, sub: Submission) -> bool:
    """Check whether the user meets the task's evaluator eligibility policy."""
    from app.models import Task  # local to avoid circular at import time

    task = db.get(Task, sub.task_id)
    if task is None:
        logger.warning(
            "event=matching_ineligible reason=task_missing submission_id=%s task_id=%s user_id=%s",
            sub.id,
            sub.task_id,
            user.id,
        )
        return False
    if task.evaluator_eligibility == EvaluatorEligibility.ANYONE:
        return True
    user_sub = db.scalar(
        select(Submission).where(
            Submission.user_id == user.id,
            Submission.task_id == sub.task_id,
        )
    )
    if user_sub is None:
        logger.debug(
            "event=matching_ineligible reason=no_prior_submission user_id=%s task_id=%s policy=%s",
            user.id,
            sub.task_id,
            task.evaluator_eligibility.value,
        )
        return False
    if task.evaluator_eligibility == EvaluatorEligibility.STARTED:
        return True
    eligible = user_sub.status == SubmissionStatus.COMPLETED
    if not eligible:
        logger.debug(
            "event=matching_ineligible reason=prior_submission_not_completed user_id=%s task_id=%s submission_status=%s",
            user.id,
            sub.task_id,
            user_sub.status.value,
        )
    return eligible


def available_submissions(db: Session, user: User) -> list[Submission]:
    """Submissions the user is eligible to claim, oldest-first (FIFO fairness)."""
    already_claimed = db.scalars(
        select(Evaluation.submission_id).where(Evaluation.evaluator_id == user.id)
    ).all()

    stmt = (
        select(Submission)
        .where(
            Submission.status.in_(_POOL_STATUSES),
            Submission.user_id != user.id,
        )
        .order_by(Submission.updated_at)
    )
    if already_claimed:
        stmt = stmt.where(Submission.id.not_in(already_claimed))

    candidates = db.scalars(stmt).all()
    logger.debug(
        "event=matching_pool_scanned user_id=%s pool_candidates=%s already_claimed=%s",
        user.id,
        len(candidates),
        len(already_claimed),
    )

    result = []
    for sub in candidates:
        from app.models import Task
        task = db.get(Task, sub.task_id)
        if task and _active_eval_count(db, sub.id) < task.required_evaluations:
            if _eligible(db, user, sub):
                result.append(sub)
    logger.info(
        "event=matching_available user_id=%s eligible_submissions=%s",
        user.id,
        len(result),
    )
    return result


def claim_submission(db: Session, user: User, submission_id: int) -> Evaluation:
    """Atomically claim an evaluation slot.

    Locks the submission row so two concurrent requests can't both pass the
    'still needs evaluators' check and exceed required_evaluations.
    """
    logger.info(
        "event=matching_claim_attempt evaluator_id=%s submission_id=%s",
        user.id,
        submission_id,
    )
    stmt = select(Submission).where(Submission.id == submission_id)
    if engine.dialect.name != "sqlite":
        stmt = stmt.with_for_update(skip_locked=True)
    sub = db.scalar(stmt)

    if sub is None:
        logger.warning(
            "event=matching_claim_failed reason=not_found_or_locked evaluator_id=%s submission_id=%s",
            user.id,
            submission_id,
        )
        raise HTTPException(404, "Submission not found or locked by another claim")

    if sub.user_id == user.id:
        logger.warning(
            "event=matching_claim_failed reason=own_submission evaluator_id=%s submission_id=%s",
            user.id,
            submission_id,
        )
        raise HTTPException(409, "Cannot evaluate your own submission")

    already = db.scalar(
        select(Evaluation).where(
            Evaluation.submission_id == submission_id,
            Evaluation.evaluator_id == user.id,
        )
    )
    if already:
        logger.warning(
            "event=matching_claim_failed reason=already_claimed evaluator_id=%s submission_id=%s evaluation_id=%s",
            user.id,
            submission_id,
            already.id,
        )
        raise HTTPException(409, "Already claimed this submission")

    from app.models import Task
    task = db.get(Task, sub.task_id)
    if task is None:
        logger.error(
            "event=matching_claim_failed reason=task_missing submission_id=%s task_id=%s",
            submission_id,
            sub.task_id,
        )
        raise HTTPException(404, "Task not found")

    active_count = _active_eval_count(db, submission_id)
    if active_count >= task.required_evaluations:
        logger.warning(
            "event=matching_claim_failed reason=evaluator_slots_full submission_id=%s active_evaluators=%s required=%s",
            submission_id,
            active_count,
            task.required_evaluations,
        )
        raise HTTPException(409, "Submission already has enough evaluators")

    if not _eligible(db, user, sub):
        logger.warning(
            "event=matching_claim_failed reason=not_eligible evaluator_id=%s submission_id=%s task_id=%s",
            user.id,
            submission_id,
            sub.task_id,
        )
        raise HTTPException(403, "Not eligible to evaluate this task")

    previous_status = sub.status
    ev = Evaluation(
        submission_id=submission_id,
        evaluator_id=user.id,
        evaluatee_id=sub.user_id,
        status=EvaluationStatus.CLAIMED,
    )
    db.add(ev)
    if sub.status == SubmissionStatus.READY:
        sub.status = SubmissionStatus.MATCHED
    db.commit()
    db.refresh(ev)
    evaluator_label = display_user(user)
    evaluatee = db.get(User, sub.user_id)
    evaluatee_label = display_user(evaluatee, user_id=sub.user_id)
    logger.info(
        "event=matching_claim_success evaluation_id=%s evaluator_id=%s evaluatee_id=%s submission_id=%s task_id=%s submission_status_before=%s submission_status_after=%s active_evaluators=%s required=%s",
        ev.id,
        user.id,
        sub.user_id,
        submission_id,
        sub.task_id,
        previous_status.value,
        sub.status.value,
        active_count + 1,
        task.required_evaluations,
    )
    log_user_journey(
        logger,
        "users_matched",
        f"{evaluator_label} was matched to review {evaluatee_label}'s work on \"{task.title}\".",
        evaluation_id=ev.id,
        evaluator_id=user.id,
        evaluatee_id=sub.user_id,
        submission_id=submission_id,
        task_id=sub.task_id,
    )
    return ev
