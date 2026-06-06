"""Tracks per-user per-task state that doesn't live on a Submission.

A row is created when a user starts a task.  Notes are personal working
notes the user keeps while completing the task; they are pre-filled into
the submission when the user closes for evaluation, but remain editable
independently.
"""
import datetime as dt
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base

if TYPE_CHECKING:
    from app.models.task import Task
    from app.models.user import User


class UserTaskProgress(Base):
    __tablename__ = "user_task_progress"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    task_id: Mapped[int] = mapped_column(ForeignKey("tasks.id"), index=True)
    notes: Mapped[str] = mapped_column(Text, default="")
    started_at: Mapped[dt.datetime] = mapped_column(server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="task_progress")
    task: Mapped["Task"] = relationship(back_populates="user_progress")

    __table_args__ = (
        UniqueConstraint("user_id", "task_id", name="uq_user_task_progress"),
    )
