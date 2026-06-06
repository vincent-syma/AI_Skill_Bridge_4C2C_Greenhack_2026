"""Submission model. Employees submit their AI-task output here.

Lifecycle: DRAFT → READY (enters pool) → MATCHED (evaluator claimed) → COMPLETED.
attempt_number increments per task so a user can redo a task after completing it.
"""
import datetime as dt
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base
from app.models.enums import SubmissionStatus, enum_col

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.task import Task


class Submission(Base):
    __tablename__ = "submissions"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    task_id: Mapped[int] = mapped_column(ForeignKey("tasks.id"), index=True)
    content: Mapped[str] = mapped_column(Text)
    file_path: Mapped[str | None] = mapped_column(String(500), default=None)
    file_name: Mapped[str | None] = mapped_column(String(255), default=None)
    attempt_number: Mapped[int] = mapped_column(default=1)
    status: Mapped[SubmissionStatus] = mapped_column(
        enum_col(SubmissionStatus), default=SubmissionStatus.DRAFT, index=True
    )
    # Showcase fields — set by power users / admin to feature good work
    is_showcase: Mapped[bool] = mapped_column(Boolean, default=False)
    helpful_count: Mapped[int] = mapped_column(Integer, default=0)
    featured_at: Mapped[dt.datetime | None] = mapped_column(default=None)

    created_at: Mapped[dt.datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[dt.datetime] = mapped_column(
        server_default=func.now(), onupdate=func.now()
    )

    user: Mapped["User"] = relationship(back_populates="submissions")
    task: Mapped["Task"] = relationship(back_populates="submissions")
