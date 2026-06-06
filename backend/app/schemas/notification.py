"""Schemas for /api/v1/notifications endpoints."""
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class NotificationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    kind: str
    title: str
    message: str
    link: str | None
    is_read: bool
    created_at: datetime
