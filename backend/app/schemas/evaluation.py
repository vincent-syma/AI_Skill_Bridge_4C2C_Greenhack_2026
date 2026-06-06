from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import EvaluationStatus


class EvaluationResponseInput(BaseModel):
    rubric_item_id: int
    value_bool: bool | None = None
    value_scale: int | None = Field(default=None, ge=1, le=5)
    value_text: str | None = None


class EvaluationSubmitInput(BaseModel):
    responses: list[EvaluationResponseInput]
    overall_pass: bool
    feedback: str = Field(min_length=1)


class ConfirmInput(BaseModel):
    helpful: bool


class ClaimInput(BaseModel):
    submission_id: int


class EvaluationResponseRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    rubric_item_id: int
    value_bool: bool | None
    value_scale: int | None
    value_text: str | None


class EvaluationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    submission_id: int
    evaluator_id: int
    evaluatee_id: int
    status: EvaluationStatus
    overall_pass: bool | None
    feedback: str | None
    helpful: bool | None
    xp_granted: bool
    created_at: datetime
    submitted_at: datetime | None
    confirmed_at: datetime | None
    responses: list[EvaluationResponseRead] = []
