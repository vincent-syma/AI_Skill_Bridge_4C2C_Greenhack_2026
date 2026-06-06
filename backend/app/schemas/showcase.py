"""Schemas for /api/v1/showcase endpoints."""
from datetime import datetime

from pydantic import BaseModel


class ShowcaseAuthor(BaseModel):
    id: int
    name: str | None
    department: str | None
    initials: str


class ShowcaseItem(BaseModel):
    id: int  # submission id
    task_id: int
    task_title: str
    task_category: str | None
    tools: list
    author: ShowcaseAuthor
    helpful_count: int
    is_featured: bool
    featured_at: datetime | None
    created_at: datetime
    # evaluation summary
    overall_pass: bool | None
    avg_score: float | None  # average rubric scale score


class ShowcaseFeed(BaseModel):
    items: list[ShowcaseItem]
    total: int
    page: int
    page_size: int
