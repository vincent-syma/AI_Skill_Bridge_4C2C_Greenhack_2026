"""User model. Login is by email. xp is denormalized onto the row for
fast dashboard reads; level is *derived* from xp in the gamification
service, so it isn't stored here (single source of truth = xp).
settings stores UI preferences (theme, language, accent colour) as JSON.
"""
import datetime as dt
from typing import TYPE_CHECKING

from sqlalchemy import JSON, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base
from app.models.enums import UserRole, enum_col

if TYPE_CHECKING:
    from app.models.evaluation import Evaluation
    from app.models.notification import Notification
    from app.models.password_reset import PasswordResetToken
    from app.models.submission import Submission
    from app.models.user_task_progress import UserTaskProgress


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[UserRole] = mapped_column(enum_col(UserRole), default=UserRole.USER)

    # Profile fields
    name: Mapped[str | None] = mapped_column(String(200), default=None)
    department: Mapped[str | None] = mapped_column(String(100), default=None)
    avatar_url: Mapped[str | None] = mapped_column(String(500), default=None)

    # Gamification
    xp: Mapped[int] = mapped_column(default=0)
    streak: Mapped[int] = mapped_column(default=0)

    # UI preferences: {"theme": "dark", "language": "en", "accent": "#0ea5b5"}
    settings: Mapped[dict] = mapped_column(JSON, default=dict)

    created_at: Mapped[dt.datetime] = mapped_column(server_default=func.now())
    # Live presence: bumped (throttled) on every authenticated request so we
    # can surface "available now" peers. Nullable for rows created before the
    # column existed. Stored in UTC.
    last_active: Mapped[dt.datetime | None] = mapped_column(default=None)

    submissions: Mapped[list["Submission"]] = relationship(back_populates="user")
    evaluations_given: Mapped[list["Evaluation"]] = relationship(
        back_populates="evaluator", foreign_keys="Evaluation.evaluator_id"
    )
    evaluations_received: Mapped[list["Evaluation"]] = relationship(
        back_populates="evaluatee", foreign_keys="Evaluation.evaluatee_id"
    )
    task_progress: Mapped[list["UserTaskProgress"]] = relationship(
        back_populates="user"
    )
    notifications: Mapped[list["Notification"]] = relationship(
        back_populates="user"
    )
    password_reset_tokens: Mapped[list["PasswordResetToken"]] = relationship(
        back_populates="user"
    )
