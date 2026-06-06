"""Evaluation models (pull-based, rubric-driven).

ReviewPair is gone. An Evaluation is one evaluator's review of one
submission; a submission is validated when it accumulates
task.required_evaluations submitted evaluations.

RubricItem defines the correction grid (power-user configurable per task).
EvaluationResponse stores the per-item answers for one evaluation.

Cascade on RubricItem → EvaluationResponse: deleting a question also
removes the answers to it. Power users should not delete items from tasks
that are under active evaluation -- the service layer will warn, but the
DB enforces a clean removal.
"""
import datetime as dt
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, Index, Integer, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base
from app.models.enums import EvaluationStatus, RubricKind, enum_col

if TYPE_CHECKING:
    from app.models.user import User


class RubricItem(Base):
    __tablename__ = "rubric_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    task_id: Mapped[int] = mapped_column(ForeignKey("tasks.id"), index=True)
    prompt: Mapped[str] = mapped_column(Text)
    kind: Mapped[RubricKind] = mapped_column(enum_col(RubricKind))
    position: Mapped[int] = mapped_column(default=0)

    responses: Mapped[list["EvaluationResponse"]] = relationship(
        back_populates="rubric_item", cascade="all, delete-orphan"
    )


class Evaluation(Base):
    __tablename__ = "evaluations"

    id: Mapped[int] = mapped_column(primary_key=True)
    submission_id: Mapped[int] = mapped_column(ForeignKey("submissions.id"), index=True)
    evaluator_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    evaluatee_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    status: Mapped[EvaluationStatus] = mapped_column(
        enum_col(EvaluationStatus), default=EvaluationStatus.CLAIMED
    )
    overall_pass: Mapped[bool | None] = mapped_column(Boolean, default=None)
    feedback: Mapped[str | None] = mapped_column(Text, default=None)
    helpful: Mapped[bool | None] = mapped_column(Boolean, default=None)
    xp_granted: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[dt.datetime] = mapped_column(server_default=func.now())
    submitted_at: Mapped[dt.datetime | None] = mapped_column(default=None)
    confirmed_at: Mapped[dt.datetime | None] = mapped_column(default=None)

    evaluator: Mapped["User"] = relationship(
        back_populates="evaluations_given", foreign_keys=[evaluator_id]
    )
    evaluatee: Mapped["User"] = relationship(
        back_populates="evaluations_received", foreign_keys=[evaluatee_id]
    )
    responses: Mapped[list["EvaluationResponse"]] = relationship(
        back_populates="evaluation", cascade="all, delete-orphan"
    )

    __table_args__ = (
        UniqueConstraint(
            "submission_id", "evaluator_id", name="uq_eval_sub_evaluator"
        ),
        # Hot path: queue (evaluator_id + status), received (evaluatee_id + status),
        # pool gate (submission_id + status). Composite beats the three single-col FKs.
        Index("ix_eval_evaluator_status_created", "evaluator_id", "status", "created_at"),
        Index("ix_eval_evaluatee_status_submitted", "evaluatee_id", "status", "submitted_at"),
        Index("ix_eval_submission_status", "submission_id", "status"),
    )


class EvaluationResponse(Base):
    __tablename__ = "evaluation_responses"

    id: Mapped[int] = mapped_column(primary_key=True)
    evaluation_id: Mapped[int] = mapped_column(ForeignKey("evaluations.id"), index=True)
    rubric_item_id: Mapped[int] = mapped_column(
        ForeignKey("rubric_items.id", ondelete="CASCADE")
    )
    value_bool: Mapped[bool | None] = mapped_column(Boolean, default=None)
    value_scale: Mapped[int | None] = mapped_column(Integer, default=None)
    value_text: Mapped[str | None] = mapped_column(Text, default=None)

    evaluation: Mapped["Evaluation"] = relationship(back_populates="responses")
    rubric_item: Mapped["RubricItem"] = relationship(back_populates="responses")

    __table_args__ = (
        UniqueConstraint(
            "evaluation_id", "rubric_item_id", name="uq_response_eval_item"
        ),
    )
