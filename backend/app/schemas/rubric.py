from pydantic import BaseModel, ConfigDict, Field
from app.models.enums import RubricKind


class RubricItemCreate(BaseModel):
    prompt: str = Field(min_length=1)
    kind: RubricKind
    position: int = 0


class RubricItemUpdate(BaseModel):
    prompt: str | None = Field(default=None, min_length=1)
    kind: RubricKind | None = None
    position: int | None = None


class RubricItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    task_id: int
    prompt: str
    kind: RubricKind
    position: int
