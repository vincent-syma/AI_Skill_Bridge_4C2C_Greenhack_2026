"""Metadata endpoints — departments, tools, task-types, search."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy import distinct, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.db import get_db
from app.core.logging import get_logger
from app.models import Task, User
from app.models.enums import TaskStatus

router = APIRouter(tags=["meta"])
logger = get_logger(__name__)

DEPARTMENTS = [
    "Engineering", "Marketing", "Finance", "HR", "Operations", "Sales", "Legal", "Product",
]

AI_TOOLS = [
    "ChatGPT", "Claude", "Copilot", "Excel Copilot", "Notion AI",
    "Midjourney", "Gamma", "Zapier AI", "Gemini",
]

TASK_TYPES = [
    "Summarize", "Reporting", "Content", "Chatbot", "Automation",
    "Basics", "Prompting", "Research", "Analysis",
    # Risk Management curriculum (`category` = task type)
    "prompt_lab", "vibecode_spa", "scenario_review", "control_mapping",
    "vendor_review", "policy_intake", "tabletop",
]

CURRICULA = [
    {
        "id": "risk-management",
        "title": "Risk Management — AI Governance",
        "description": "Four-day workshop: prompting, judgment, validation, vibecoding to GitHub Pages.",
        "track_tool": "track:risk-management",
        "days": 4,
        "position_min": 100,
    },
]


@router.get("/departments")
def departments(_user: User = Depends(get_current_user)) -> list[str]:
    return DEPARTMENTS


@router.get("/tools")
def tools(_user: User = Depends(get_current_user)) -> list[str]:
    return AI_TOOLS


@router.get("/task-types")
def task_types(_user: User = Depends(get_current_user)) -> list[str]:
    return TASK_TYPES


@router.get("/curricula")
def curricula(_user: User = Depends(get_current_user)) -> list[dict]:
    return CURRICULA


@router.get("/search")
def search(
    q: str = Query(min_length=1),
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> dict:
    tasks = db.scalars(
        select(Task).where(
            Task.status == TaskStatus.VISIBLE,
            Task.title.ilike(f"%{q}%"),
        ).limit(10)
    ).all()
    logger.debug(
        "event=meta_search query=%s result_count=%s",
        q,
        len(tasks),
    )
    return {
        "projects": [{"id": t.id, "title": t.title, "category": t.category} for t in tasks],
    }
