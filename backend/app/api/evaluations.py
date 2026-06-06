"""Evaluation endpoints (pull model).

Evaluators browse /available, claim a submission, fill the rubric form,
and submit. The evaluatee then sees the feedback via /to-confirm and marks
it helpful or not.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.db import get_db
from app.core.logging import display_user, get_logger, log_user_journey
from app.models import Evaluation, User
from app.models.enums import EvaluationStatus
from app.schemas.evaluation import (
    ClaimInput,
    ConfirmInput,
    EvaluationRead,
    EvaluationSubmitInput,
)
from app.schemas.submission import SubmissionRead
from app.services import evaluation as eval_svc
from app.services import matching

router = APIRouter(prefix="/evaluations", tags=["evaluations"])
logger = get_logger(__name__)


@router.get("/available", response_model=list[SubmissionRead])
def available(
    db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> list:
    """Submissions the caller is eligible to evaluate, oldest-first."""
    subs = matching.available_submissions(db, user)
    label = display_user(user)
    count = len(subs)
    if count == 0:
        desc = f"User {label} browsed the peer review queue — nothing available to claim."
    elif count == 1:
        desc = f"User {label} browsed the peer review queue — 1 submission available."
    else:
        desc = f"User {label} browsed the peer review queue — {count} submissions available."
    log_user_journey(
        logger,
        "user_browsed_peer_review_queue",
        desc,
        user_id=user.id,
        available_count=count,
    )
    return subs


@router.post("/claim", response_model=EvaluationRead, status_code=201)
def claim(
    body: ClaimInput,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Evaluation:
    return matching.claim_submission(db, user, body.submission_id)


@router.get("/my", response_model=list[EvaluationRead])
def my_evaluations(
    db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> list[Evaluation]:
    """Evaluations I have been assigned to fill in."""
    return list(
        db.scalars(select(Evaluation).where(Evaluation.evaluator_id == user.id))
    )


@router.get("/to-confirm", response_model=list[EvaluationRead])
def to_confirm(
    db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> list[Evaluation]:
    """Submitted evaluations on my submissions that I have not yet confirmed."""
    return list(
        db.scalars(
            select(Evaluation).where(
                Evaluation.evaluatee_id == user.id,
                Evaluation.status == EvaluationStatus.SUBMITTED,
            )
        )
    )


@router.get("/{eval_id}", response_model=EvaluationRead)
def get_evaluation(
    eval_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Evaluation:
    ev = db.get(Evaluation, eval_id)
    if ev is None or (ev.evaluator_id != user.id and ev.evaluatee_id != user.id):
        raise HTTPException(404, "Evaluation not found")
    return ev


@router.post("/{eval_id}/submit", response_model=EvaluationRead)
def submit(
    eval_id: int,
    body: EvaluationSubmitInput,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Evaluation:
    ev = db.get(Evaluation, eval_id)
    if ev is None or ev.evaluator_id != user.id:
        raise HTTPException(404, "Evaluation not found")
    logger.info(
        "event=evaluation_submit_request evaluation_id=%s evaluator_id=%s submission_id=%s response_count=%s overall_pass=%s",
        ev.id,
        user.id,
        ev.submission_id,
        len(body.responses),
        body.overall_pass,
    )
    return eval_svc.submit_evaluation(
        db, ev, body.responses, body.overall_pass, body.feedback
    )


@router.post("/{eval_id}/confirm", response_model=EvaluationRead)
def confirm(
    eval_id: int,
    body: ConfirmInput,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Evaluation:
    ev = db.get(Evaluation, eval_id)
    if ev is None or ev.evaluatee_id != user.id:
        raise HTTPException(404, "Evaluation not found")
    logger.info(
        "event=evaluation_confirm_request evaluation_id=%s evaluatee_id=%s evaluator_id=%s helpful=%s",
        ev.id,
        user.id,
        ev.evaluator_id,
        body.helpful,
    )
    return eval_svc.confirm_evaluation(db, ev, body.helpful)
