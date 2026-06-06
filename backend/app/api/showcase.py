"""Showcase API — /api/v1/showcase.

Returns completed submissions as a browsable feed.  Items are sorted by
helpful_count desc then created_at desc.  Featured items have is_showcase=True.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.db import get_db
from app.core.logging import get_logger
from app.models import Evaluation, Submission, Task, User
from app.models.enums import EvaluationStatus, SubmissionStatus
from app.schemas.showcase import ShowcaseAuthor, ShowcaseFeed, ShowcaseItem

router = APIRouter(prefix="/showcase", tags=["showcase"])
logger = get_logger(__name__)


def _avg_score(db: Session, submission_id: int) -> float | None:
    from app.models.evaluation import EvaluationResponse
    scores = db.scalars(
        select(EvaluationResponse.value_scale).where(
            EvaluationResponse.evaluation_id.in_(
                select(Evaluation.id).where(
                    Evaluation.submission_id == submission_id,
                    Evaluation.status.in_(
                        [EvaluationStatus.SUBMITTED, EvaluationStatus.CONFIRMED]
                    ),
                )
            ),
            EvaluationResponse.value_scale.isnot(None),
        )
    ).all()
    return round(sum(scores) / len(scores), 2) if scores else None


def _overall_pass(db: Session, submission_id: int) -> bool | None:
    ev = db.scalar(
        select(Evaluation).where(
            Evaluation.submission_id == submission_id,
            Evaluation.status.in_(
                [EvaluationStatus.SUBMITTED, EvaluationStatus.CONFIRMED]
            ),
        )
    )
    return ev.overall_pass if ev else None


def _build_item(db: Session, sub: Submission) -> ShowcaseItem:
    author = db.get(User, sub.user_id)
    task = db.get(Task, sub.task_id)
    if author and author.name:
        parts = author.name.split()
        initials = "".join(p[0] for p in parts if p)[:2].upper()
    elif author:
        initials = author.email[:2].upper()
    else:
        initials = "??"
    return ShowcaseItem(
        id=sub.id,
        task_id=sub.task_id,
        task_title=task.title if task else "Unknown",
        task_category=task.category if task else None,
        tools=task.tools if task else [],
        author=ShowcaseAuthor(
            id=sub.user_id,
            name=author.name if author else None,
            department=author.department if author else None,
            initials=initials,
        ),
        helpful_count=sub.helpful_count,
        is_featured=sub.is_showcase,
        featured_at=sub.featured_at,
        created_at=sub.created_at,
        overall_pass=_overall_pass(db, sub.id),
        avg_score=_avg_score(db, sub.id),
    )


@router.get("/feed", response_model=ShowcaseFeed)
def get_feed(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=12, ge=1, le=50),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ShowcaseFeed:
    stmt = (
        select(Submission)
        .where(Submission.status == SubmissionStatus.COMPLETED)
        .order_by(desc(Submission.helpful_count), desc(Submission.created_at))
    )
    from sqlalchemy import func
    total_count = db.scalar(
        select(func.count()).select_from(Submission).where(
            Submission.status == SubmissionStatus.COMPLETED
        )
    ) or 0
    offset = (page - 1) * page_size
    subs = db.scalars(stmt.offset(offset).limit(page_size)).all()
    return ShowcaseFeed(
        items=[_build_item(db, s) for s in subs],
        total=total_count,
        page=page,
        page_size=page_size,
    )


@router.get("/featured", response_model=list[ShowcaseItem])
def get_featured(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[ShowcaseItem]:
    subs = db.scalars(
        select(Submission)
        .where(
            Submission.status == SubmissionStatus.COMPLETED,
            Submission.is_showcase.is_(True),
        )
        .order_by(desc(Submission.featured_at), desc(Submission.helpful_count))
        .limit(3)
    ).all()
    # Fall back to most helpful if none are explicitly featured
    if not subs:
        subs = db.scalars(
            select(Submission)
            .where(Submission.status == SubmissionStatus.COMPLETED)
            .order_by(desc(Submission.helpful_count), desc(Submission.created_at))
            .limit(1)
        ).all()
    return [_build_item(db, s) for s in subs]


@router.get("/{submission_id}", response_model=ShowcaseItem)
def get_item(
    submission_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ShowcaseItem:
    sub = db.get(Submission, submission_id)
    if sub is None or sub.status != SubmissionStatus.COMPLETED:
        raise HTTPException(status_code=404, detail="Showcase item not found")
    return _build_item(db, sub)


@router.post("/{submission_id}/helpful", response_model=dict)
def mark_helpful(
    submission_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    sub = db.get(Submission, submission_id)
    if sub is None or sub.status != SubmissionStatus.COMPLETED:
        raise HTTPException(status_code=404, detail="Showcase item not found")
    sub.helpful_count += 1
    db.commit()
    logger.info(
        "event=showcase_mark_helpful submission_id=%s user_id=%s helpful_count=%s",
        submission_id,
        user.id,
        sub.helpful_count,
    )
    return {"submission_id": submission_id, "helpful_count": sub.helpful_count}


@router.post("/{submission_id}/share", response_model=dict)
def share_item(
    submission_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    sub = db.get(Submission, submission_id)
    if sub is None or sub.status != SubmissionStatus.COMPLETED:
        raise HTTPException(status_code=404, detail="Showcase item not found")
    logger.info(
        "event=showcase_share submission_id=%s user_id=%s",
        submission_id,
        user.id,
    )
    return {"submission_id": submission_id, "shared": True}
