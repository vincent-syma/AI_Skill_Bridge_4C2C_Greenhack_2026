"""Schemas for /api/v1/users/me and related endpoints."""
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr

from app.models.enums import UserRole
from app.schemas.auth import BadgeRead


class UserMe(BaseModel):
    """Full profile returned by GET /users/me."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    role: UserRole
    name: str | None
    department: str | None
    avatar_url: str | None
    xp: int
    streak: int
    level: int
    created_at: datetime

    @classmethod
    def from_orm_with_level(cls, user, level: int) -> "UserMe":
        obj = cls.model_validate(user)
        object.__setattr__(obj, "level", level)
        return obj


class UserUpdate(BaseModel):
    name: str | None = None
    department: str | None = None
    avatar_url: str | None = None


class UserSettings(BaseModel):
    theme: str = "dark"
    language: str = "en"
    accent: str = "#0ea5b5"
    onboarding_completed: bool = False
    ai_base_url: str | None = None


class UserSettingsPatch(BaseModel):
    """Partial settings update; extra keys are stored in user.settings JSON."""

    model_config = ConfigDict(extra="allow")

    theme: str | None = None
    language: str | None = None
    accent: str | None = None
    onboarding_completed: bool | None = None
    onboarding_goals: list[str] | None = None
    onboarding_role: str | None = None
    onboarding_ai_comfort: str | None = None
    ai_base_url: str | None = None


class UserStats(BaseModel):
    projects_done: int
    projects_awaiting_eval: int
    projects_in_progress: int
    evals_given: int
    evals_received: int
    streak: int
    xp: int
    level: int
    xp_to_next_level: int


class ActivityItem(BaseModel):
    id: int
    kind: str       # "xp_earned", "badge_earned", "eval_received"
    label: str
    xp_delta: int | None
    created_at: datetime
