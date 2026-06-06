"""Submission schemas. We expose file_name (so the UI can show "report.pdf")
but never file_path -- the on-disk location is internal. The file itself is
fetched via GET /submissions/{id}/file, which enforces permissions.
"""
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.enums import SubmissionStatus


class SubmissionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    task_id: int
    content: str
    file_name: str | None
    attempt_number: int
    status: SubmissionStatus
    is_showcase: bool = False
    helpful_count: int = 0
    created_at: datetime
    updated_at: datetime
