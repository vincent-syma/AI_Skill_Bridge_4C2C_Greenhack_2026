"""Schemas for /api/v1/projects endpoints.

Projects are Tasks enriched with the calling user's current progress.
user_status mirrors frontend terminology: not_started / doing / submitted / completed.
"""
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import TaskStatus

UserProjectStatus = Literal["not_started", "doing", "submitted", "completed"]


class ProjectRead(BaseModel):
    """List-level project card."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: str | None
    category: str | None
    difficulty: int
    xp_reward: int
    estimated_time: str | None
    tools: list
    position: int
    status: TaskStatus

    # per-user progress
    user_status: UserProjectStatus
    my_notes: str
    my_latest_submission_id: int | None
    my_grade: float | None  # avg scale score from evaluation, None until evaluated


class ProjectDetail(ProjectRead):
    """Detail view including full instructions and rubric summary."""
    instructions: str
    evaluator_guide: str | None
    created_at: datetime


class ProjectBrief(BaseModel):
    """Focused read for the brief/instructions modal."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    instructions: str
    evaluator_guide: str | None
    tools: list
    difficulty: int
    xp_reward: int


class ProjectStartResponse(BaseModel):
    project_id: int
    user_status: UserProjectStatus
    started_at: datetime


class ProjectNotesUpdate(BaseModel):
    notes: str = Field(default="")


class ProjectSubmitRequest(BaseModel):
    notes: str | None = None  # overrides saved notes if provided


class ProjectSubmitResponse(BaseModel):
    project_id: int
    submission_id: int
    user_status: UserProjectStatus
