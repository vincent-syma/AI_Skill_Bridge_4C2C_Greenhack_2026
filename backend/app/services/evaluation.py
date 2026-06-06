"""Evaluation lifecycle service: submit form and confirm helpful.

submit_evaluation: evaluator fills the rubric form + sets overall_pass.
  After flushing the status change, we count how many submitted evaluations
  this submission now has; if it reaches required_evaluations the submission
  transitions to COMPLETED. XP granting is a hook for the gamification layer.

confirm_evaluation: evaluatee confirms whether the feedback was helpful.
  This gates the evaluator's XP (also delegated to gamification).
"""
import datetime as dt

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.logging import get_logger
from app.models import Evaluation, EvaluationResponse, Submission
from app.models.enums import EvaluationStatus, SubmissionStatus
from app.schemas.evaluation import EvaluationResponseInput

logger = get_logger(__name__)


def submit_evaluation(
    db: Session,
    evaluation: Evaluation,
    responses: list[EvaluationResponseInput],
    overall_pass: bool,
    feedback: str,
) -> Evaluation:
    if evaluation.status != EvaluationStatus.CLAIMED:
        logger.warning(
            "event=evaluation_submit_rejected reason=wrong_status evaluation_id=%s status=%s",
            evaluation.id,
            evaluation.status.value,
        )
        raise HTTPException(409, "Evaluation is not in CLAIMED state")

    logger.info(
        "event=evaluation_submit_begin evaluation_id=%s evaluator_id=%s submission_id=%s response_count=%s overall_pass=%s feedback_length=%s",
        evaluation.id,
        evaluation.evaluator_id,
        evaluation.submission_id,
        len(responses),
        overall_pass,
        len(feedback),
    )

    for r in responses:
        existing = db.scalar(
            select(EvaluationResponse).where(
                EvaluationResponse.evaluation_id == evaluation.id,
                EvaluationResponse.rubric_item_id == r.rubric_item_id,
            )
        )
        if existing:
            existing.value_bool = r.value_bool
            existing.value_scale = r.value_scale
            existing.value_text = r.value_text
            logger.debug(
                "event=evaluation_response_updated evaluation_id=%s rubric_item_id=%s",
                evaluation.id,
                r.rubric_item_id,
            )
        else:
            db.add(
                EvaluationResponse(
                    evaluation_id=evaluation.id,
                    rubric_item_id=r.rubric_item_id,
                    value_bool=r.value_bool,
                    value_scale=r.value_scale,
                    value_text=r.value_text,
                )
            )
            logger.debug(
                "event=evaluation_response_created evaluation_id=%s rubric_item_id=%s",
                evaluation.id,
                r.rubric_item_id,
            )

    evaluation.overall_pass = overall_pass
    evaluation.feedback = feedback
    evaluation.status = EvaluationStatus.SUBMITTED
    evaluation.submitted_at = dt.datetime.now(dt.timezone.utc)

    db.flush()

    from app.models import Task

    sub = db.get(Submission, evaluation.submission_id)
    task = db.get(Task, sub.task_id)
    submitted_count = db.scalar(
        select(func.count()).select_from(Evaluation).where(
            Evaluation.submission_id == evaluation.submission_id,
            Evaluation.status.in_(
                [EvaluationStatus.SUBMITTED, EvaluationStatus.CONFIRMED]
            ),
        )
    ) or 0

    completed = submitted_count >= task.required_evaluations
    if completed:
        sub.status = SubmissionStatus.COMPLETED
        logger.info(
            "event=submission_completed submission_id=%s task_id=%s evaluatee_id=%s submitted_evaluations=%s required=%s",
            sub.id,
            task.id,
            sub.user_id,
            submitted_count,
            task.required_evaluations,
        )

    db.commit()
    db.refresh(evaluation)
    logger.info(
        "event=evaluation_submit_success evaluation_id=%s submission_id=%s submission_status=%s submitted_evaluations=%s required=%s overall_pass=%s",
        evaluation.id,
        evaluation.submission_id,
        sub.status.value,
        submitted_count,
        task.required_evaluations,
        overall_pass,
    )
    return evaluation


def confirm_evaluation(
    db: Session, evaluation: Evaluation, helpful: bool
) -> Evaluation:
    if evaluation.status != EvaluationStatus.SUBMITTED:
        logger.warning(
            "event=evaluation_confirm_rejected reason=wrong_status evaluation_id=%s status=%s",
            evaluation.id,
            evaluation.status.value,
        )
        raise HTTPException(409, "Evaluation has not been submitted yet")
    evaluation.helpful = helpful
    evaluation.status = EvaluationStatus.CONFIRMED
    evaluation.confirmed_at = dt.datetime.now(dt.timezone.utc)
    db.commit()
    db.refresh(evaluation)
    logger.info(
        "event=evaluation_confirmed evaluation_id=%s evaluatee_id=%s evaluator_id=%s submission_id=%s helpful=%s",
        evaluation.id,
        evaluation.evaluatee_id,
        evaluation.evaluator_id,
        evaluation.submission_id,
        helpful,
    )
    return evaluation
