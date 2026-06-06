"""User availability for peer evaluations.

Stored as a JSON blob per user: { "Mon|09:00": "open", "Tue|13:00": "open" }.
Values: "open" (available), "booked" (slot taken by peer), or absent (closed).
"""
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, JSON, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base

if TYPE_CHECKING:
    from app.models.user import User


class UserAvailability(Base):
    __tablename__ = "user_availability"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"), unique=True, index=True
    )
    # {"Mon|09:00": "open", "Tue|13:00": "booked"} — whole grid in one blob
    slots: Mapped[dict] = mapped_column(JSON, default=dict)

    user: Mapped["User"] = relationship()

    __table_args__ = (UniqueConstraint("user_id", name="uq_user_availability"),)
