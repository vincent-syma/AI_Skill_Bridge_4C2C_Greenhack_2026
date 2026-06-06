"""Peer evaluations API — /api/v1/peer-evaluations.

queue    = evaluations assigned to ME that I still need to fill in
received = evaluations done on MY submissions (for me to confirm)
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_current_user
from app.core.db import get_db
from app.core.logging import get_logger
from app.models import Evaluation, Submission, Task, User
from app.models.enums import EvaluationStatus
from app.schemas.peer_eval import (
    EvaluatorInfo,
    PeerEvalAvailableItem,
    PeerEvalClaimRequest,
    PeerEvalQueueItem,
    PeerEvalReceived,
    PeerConfirmRequest,
    PeerEvalSubmitRequest,
    SubmissionInfo,
)
from app.schemas.evaluation import EvaluationRead
from app.services import evaluation as eval_svc
from app.services import matching

router = APIRouter(prefix="/peer-evaluations", tags=["peer-evaluations"])
logger = get_logger(__name__)


def _user_info(user: User) -> EvaluatorInfo:
    if user.name:
        parts = user.name.split()
        initials = "".join(p[0] for p in parts if p)[:2].upper()
    else:
        initials = user.email[:2].upper()
    return EvaluatorInfo(
        id=user.id,
        name=user.name,
        department=user.department,
        initials=initials,
    )


def _sub_info(db: Session, sub: Submission, task: Task | None = None) -> SubmissionInfo:
    if task is None:
        task = db.get(Task, sub.task_id)
    return SubmissionInfo(
        id=sub.id,
        task_id=sub.task_id,
        task_title=task.title if task else "Unknown",
        task_category=task.category if task else None,
        content=sub.content,
        file_name=sub.file_name,
        attempt_number=sub.attempt_number,
        created_at=sub.created_at,
    )


# ── queue (evaluations I need to fill in) ─────────────────────────────────

# ── IMPORTANT: literal paths (/queue, /received) must come BEFORE wildcards /{id}

@router.get("/queue", response_model=list[PeerEvalQueueItem])
def get_queue(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[PeerEvalQueueItem]:
    evals = db.scalars(
        select(Evaluation).where(
            Evaluation.evaluator_id == user.id,
            Evaluation.status == EvaluationStatus.CLAIMED,
        ).order_by(Evaluation.created_at)
        .options(
            selectinload(Evaluation.evaluatee),
        )
    ).all()
    sub_ids = [ev.submission_id for ev in evals]
    subs: dict[int, Submission] = {}
    tasks: dict[int, Task] = {}
    if sub_ids:
        sub_rows = db.scalars(
            select(Submission)
            .where(Submission.id.in_(sub_ids))
            .options(selectinload(Submission.task))
        ).all()
        for s in sub_rows:
            subs[s.id] = s
            if s.task is not None:
                tasks[s.task_id] = s.task
    result = []
    for ev in evals:
        sub = subs.get(ev.submission_id)
        if sub is None:
            continue
        result.append(PeerEvalQueueItem(
            id=ev.id,
            status=ev.status,
            submission=_sub_info(db, sub, tasks.get(sub.task_id)),
            evaluatee=_user_info(ev.evaluatee) if ev.evaluatee else EvaluatorInfo(
                id=ev.evaluatee_id, name=None, department=None, initials="??"
            ),
            created_at=ev.created_at,
        ))
    return result


@router.get("/received", response_model=list[PeerEvalReceived])
def get_received(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[PeerEvalReceived]:
    evals = db.scalars(
        select(Evaluation).where(
            Evaluation.evaluatee_id == user.id,
            Evaluation.status.in_(
                [EvaluationStatus.SUBMITTED, EvaluationStatus.CONFIRMED]
            ),
        ).order_by(Evaluation.submitted_at.desc())
        .options(selectinload(Evaluation.evaluator))
    ).all()
    sub_ids = [ev.submission_id for ev in evals]
    subs: dict[int, Submission] = {}
    tasks: dict[int, Task] = {}
    if sub_ids:
        sub_rows = db.scalars(
            select(Submission)
            .where(Submission.id.in_(sub_ids))
            .options(selectinload(Submission.task))
        ).all()
        for s in sub_rows:
            subs[s.id] = s
            if s.task is not None:
                tasks[s.task_id] = s.task
    result = []
    for ev in evals:
        sub = subs.get(ev.submission_id)
        if sub is None:
            continue
        result.append(PeerEvalReceived(
            id=ev.id,
            status=ev.status,
            submission=_sub_info(db, sub, tasks.get(sub.task_id)),
            evaluator=_user_info(ev.evaluator) if ev.evaluator else EvaluatorInfo(
                id=ev.evaluator_id, name=None, department=None, initials="??"
            ),
            overall_pass=ev.overall_pass,
            feedback=ev.feedback,
            helpful=ev.helpful,
            submitted_at=ev.submitted_at,
            confirmed_at=ev.confirmed_at,
        ))
    return result


# ── pool (submissions I can claim) + claim ────────────────────────────────

@router.get("/available", response_model=list[PeerEvalAvailableItem])
def get_available(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[PeerEvalAvailableItem]:
    """Submissions in the pool I'm eligible to review, oldest-first (FIFO)."""
    subs = matching.available_submissions(db, user)
    evaluatee_ids = list({s.user_id for s in subs})
    evaluatees: dict[int, User] = {}
    if evaluatee_ids:
        evaluatees = {
            u.id: u
            for u in db.scalars(select(User).where(User.id.in_(evaluatee_ids))).all()
        }
    result: list[PeerEvalAvailableItem] = []
    for sub in subs:
        task = db.get(Task, sub.task_id)  # identity-map hit after matching.available_submissions
        if task is None:
            continue
        active = matching._active_eval_count(db, sub.id)
        evaluatee = evaluatees.get(sub.user_id)
        result.append(PeerEvalAvailableItem(
            submission=_sub_info(db, sub, task),
            evaluatee=_user_info(evaluatee) if evaluatee else EvaluatorInfo(
                id=sub.user_id, name=None, department=None, initials="??"
            ),
            required_evaluations=task.required_evaluations,
            active_evaluations=active,
            slots_remaining=max(0, task.required_evaluations - active),
        ))
    return result


@router.post("/claim", response_model=PeerEvalQueueItem)
def claim_submission(
    body: PeerEvalClaimRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> PeerEvalQueueItem:
    """Atomically claim an evaluation slot and return the new queue item."""
    ev = matching.claim_submission(db, user, body.submission_id)
    sub = db.get(Submission, ev.submission_id)
    evaluatee = db.get(User, ev.evaluatee_id)
    return PeerEvalQueueItem(
        id=ev.id,
        status=ev.status,
        submission=_sub_info(db, sub),
        evaluatee=_user_info(evaluatee) if evaluatee else EvaluatorInfo(
            id=ev.evaluatee_id, name=None, department=None, initials="??"
        ),
        created_at=ev.created_at,
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
def submit_evaluation(
    eval_id: int,
    body: PeerEvalSubmitRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Evaluation:
    ev = db.get(Evaluation, eval_id)
    if ev is None or ev.evaluator_id != user.id:
        raise HTTPException(404, "Evaluation not found")
    from app.schemas.evaluation import EvaluationResponseInput
    responses = [
        EvaluationResponseInput(**r.model_dump()) for r in body.responses
    ]
    logger.info(
        "event=peer_eval_submit_request evaluation_id=%s evaluator_id=%s response_count=%s overall_pass=%s",
        ev.id,
        user.id,
        len(responses),
        body.overall_pass,
    )
    return eval_svc.submit_evaluation(
        db, ev, responses, body.overall_pass, body.feedback
    )


@router.post("/{eval_id}/confirm", response_model=EvaluationRead)
def confirm_evaluation(
    eval_id: int,
    body: PeerConfirmRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Evaluation:
    ev = db.get(Evaluation, eval_id)
    if ev is None or ev.evaluatee_id != user.id:
        raise HTTPException(404, "Evaluation not found")
    reflections = list((user.settings or {}).get("eval_reflections", []))
    reflections.append({"eval_id": eval_id, "text": body.reflection.strip()})
    user.settings = {**(user.settings or {}), "eval_reflections": reflections[-50:]}
    db.flush()
    logger.info(
        "event=peer_eval_confirm evaluation_id=%s evaluatee_id=%s reflection_length=%s",
        eval_id,
        user.id,
        len(body.reflection.strip()),
    )
    return eval_svc.confirm_evaluation(db, ev, helpful=True)


@router.post("/{eval_id}/dispute", response_model=EvaluationRead)
def dispute_evaluation(
    eval_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Evaluation:
    """Mark feedback as not helpful (dispute)."""
    ev = db.get(Evaluation, eval_id)
    if ev is None or ev.evaluatee_id != user.id:
        raise HTTPException(404, "Evaluation not found")
    logger.info(
        "event=peer_eval_dispute evaluation_id=%s evaluatee_id=%s evaluator_id=%s",
        eval_id,
        user.id,
        ev.evaluator_id,
    )
    return eval_svc.confirm_evaluation(db, ev, helpful=False)
