"""Schemas for /api/v1/availability endpoints."""
from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class AvailabilityRead(BaseModel):
    # {"Mon|09:00": "open", "Tue|13:00": "booked"}
    slots: dict[str, str]


class AvailabilityWrite(BaseModel):
    slots: dict[str, str]


class AvailablePeer(BaseModel):
    """A peer surfaced as reachable right now for a live evaluation call.

    `via` explains *why* they showed up so the UI can badge them:
      - "live"   = recent presence heartbeat only
      - "window" = declared an open slot covering the current time only
      - "both"   = declared open AND currently active (strongest signal)
    """
    id: int
    name: str | None
    department: str | None
    initials: str
    via: Literal["live", "window", "both"]
    last_active: datetime | None
