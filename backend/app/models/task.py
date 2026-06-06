"""Task model. Tasks are data, not code -- a power user creates, edits,
reorders, and hides them at runtime. xp_reward lets harder tasks be worth
more; category is optional grouping (e.g. which AI tool the task covers).
"""
import datetime as dt
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, JSON, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base
from app.models.enums import EvaluatorEligibility, TaskStatus, enum_col

if TYPE_CHECKING:
    from app.models.submission import Submission
    from app.models.user_task_progress import UserTaskProgress


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(Text, default=None)
    instructions: Mapped[str] = mapped_column(Text)
    category: Mapped[str | None] = mapped_column(String(100), default=None)
    status: Mapped[TaskStatus] = mapped_column(
        enum_col(TaskStatus), default=TaskStatus.VISIBLE, index=True
    )
    difficulty: Mapped[int] = mapped_column(default=1)  # 1 easy / 2 medium / 3 hard
    xp_reward: Mapped[int] = mapped_column(default=100)
    estimated_time: Mapped[str | None] = mapped_column(String(50), default=None)
    tools: Mapped[list] = mapped_column(JSON, default=list)  # ["Claude", "ChatGPT"]
    position: Mapped[int] = mapped_column(default=0)  # display ordering
    created_by: Mapped[int | None] = mapped_column(
        ForeignKey("users.id"), default=None
    )
    created_at: Mapped[dt.datetime] = mapped_column(server_default=func.now())

    # --- evaluation config (power-user editable) ---
    evaluator_guide: Mapped[str | None] = mapped_column(Text, default=None)
    required_evaluations: Mapped[int] = mapped_column(default=1)
    evaluator_eligibility: Mapped[EvaluatorEligibility] = mapped_column(
        enum_col(EvaluatorEligibility), default=EvaluatorEligibility.ANYONE
    )

    submissions: Mapped[list["Submission"]] = relationship(back_populates="task")
    user_progress: Mapped[list["UserTaskProgress"]] = relationship(
        back_populates="task"
    )
