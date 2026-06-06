"""Schemas for /api/v1/peer-evaluations endpoints."""
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import EvaluationStatus


class EvaluatorInfo(BaseModel):
    id: int
    name: str | None
    department: str | None
    initials: str


class SubmissionInfo(BaseModel):
    id: int
    task_id: int
    task_title: str
    task_category: str | None
    content: str
    file_name: str | None
    attempt_number: int
    created_at: datetime


class PeerEvalQueueItem(BaseModel):
    """An evaluation I have been assigned to fill in (evaluator side)."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    status: EvaluationStatus
    submission: SubmissionInfo
    evaluatee: EvaluatorInfo
    created_at: datetime


class PeerEvalAvailableItem(BaseModel):
    """A submission sitting in the pool that I'm eligible to claim and review.

    `slots_remaining` lets the UI show scarcity ("1 slot left") so popular
    submissions get picked up before they expire.
    """
    submission: SubmissionInfo
    evaluatee: EvaluatorInfo
    required_evaluations: int
    active_evaluations: int
    slots_remaining: int


class PeerEvalClaimRequest(BaseModel):
    submission_id: int


class RubricResponseInput(BaseModel):
    rubric_item_id: int
    value_bool: bool | None = None
    value_scale: int | None = Field(default=None, ge=1, le=5)
    value_text: str | None = None


class PeerEvalSubmitRequest(BaseModel):
    responses: list[RubricResponseInput] = []
    overall_pass: bool
    feedback: str = Field(min_length=1)


class PeerEvalReceived(BaseModel):
    """An evaluation someone completed on my submission."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    status: EvaluationStatus
    submission: SubmissionInfo
    evaluator: EvaluatorInfo
    overall_pass: bool | None
    feedback: str | None
    helpful: bool | None
    submitted_at: datetime | None
    confirmed_at: datetime | None


class PeerConfirmRequest(BaseModel):
    reflection: str = Field(min_length=10, max_length=2000)
