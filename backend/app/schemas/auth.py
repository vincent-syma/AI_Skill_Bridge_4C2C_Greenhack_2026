"""Auth request/response schemas."""
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, computed_field

from app.models.enums import UserRole


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)
    name: str | None = None
    department: str | None = None


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    role: UserRole
    name: str | None = None
    department: str | None = None
    xp: int
    streak: int = 0

    @computed_field
    @property
    def level(self) -> int:
        """Derived from XP; never stored separately."""
        from app.services.gamification import get_level
        return get_level(self.xp)

    @computed_field
    @property
    def initials(self) -> str:
        if self.name:
            parts = self.name.split()
            return "".join(p[0] for p in parts if p)[:2].upper()
        return self.email[:2].upper()


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ForgotPasswordResponse(BaseModel):
    message: str
    dev_reset_url: str | None = None


class ResetPasswordRequest(BaseModel):
    token: str = Field(min_length=16)
    password: str = Field(min_length=8, max_length=72)


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8, max_length=72)


class MessageResponse(BaseModel):
    message: str


class RoleUpdate(BaseModel):
    role: UserRole


class BadgeRead(BaseModel):
    code: str
    name: str
    description: str
    earned_at: datetime


class DashboardRead(UserRead):
    badges: list[BadgeRead]
