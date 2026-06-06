"""Task schemas.

TaskUpdate is fully optional so PATCH can change one field at a time; the
endpoint applies it with exclude_unset=True so omitted fields are left
untouched (and an explicit null is distinguishable from "not sent").

TaskWithProgress augments the task with the caller's own latest status, so
the frontend can render "in review" / "completed" badges without a second
round-trip.
"""
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import SubmissionStatus, TaskStatus


class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str | None = None
    instructions: str = Field(min_length=1)
    category: str | None = None
    difficulty: int = Field(default=1, ge=1, le=3)
    xp_reward: int = Field(default=100, ge=0)
    estimated_time: str | None = None
    tools: list = Field(default_factory=list)
    position: int = Field(default=0, ge=0)


class TaskUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = None
    instructions: str | None = Field(default=None, min_length=1)
    category: str | None = None
    difficulty: int | None = Field(default=None, ge=1, le=3)
    xp_reward: int | None = Field(default=None, ge=0)
    estimated_time: str | None = None
    tools: list | None = None
    position: int | None = Field(default=None, ge=0)
    status: TaskStatus | None = None  # set to HIDDEN to retire, VISIBLE to restore


class TaskRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: str | None
    instructions: str
    category: str | None
    difficulty: int
    status: TaskStatus
    xp_reward: int
    estimated_time: str | None
    tools: list
    position: int
    created_by: int | None
    created_at: datetime


class TaskWithProgress(TaskRead):
    my_status: SubmissionStatus | None = None
    my_attempts: int = 0
    my_latest_submission_id: int | None = None
