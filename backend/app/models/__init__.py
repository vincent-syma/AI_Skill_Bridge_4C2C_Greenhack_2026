"""Import all ORM models so Base.metadata is fully populated before create_all."""
from app.models.password_reset import PasswordResetToken
from app.models.user import User
from app.models.task import Task
from app.models.submission import Submission
from app.models.evaluation import RubricItem, Evaluation, EvaluationResponse
from app.models.badge import UserBadge
from app.models.user_task_progress import UserTaskProgress
from app.models.availability import UserAvailability
from app.models.notification import Notification

__all__ = [
    "PasswordResetToken",
    "User",
    "Task",
    "Submission",
    "RubricItem",
    "Evaluation",
    "EvaluationResponse",
    "UserBadge",
    "UserTaskProgress",
    "UserAvailability",
    "Notification",
]
