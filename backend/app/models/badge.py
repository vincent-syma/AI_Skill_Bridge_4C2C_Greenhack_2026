"""UserBadge — records which badges a user has earned.

Badge definitions (name, description) live in the BADGE_REGISTRY dict in
services/gamification.py, not in a DB table. This keeps the schema simple
and lets us add badge definitions without a migration. The unique constraint
prevents the same badge from being granted twice.
"""
import datetime as dt

from sqlalchemy import ForeignKey, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class UserBadge(Base):
    __tablename__ = "user_badges"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    code: Mapped[str] = mapped_column(String(50))
    earned_at: Mapped[dt.datetime] = mapped_column(server_default=func.now())

    __table_args__ = (
        UniqueConstraint("user_id", "code", name="uq_user_badge"),
    )
