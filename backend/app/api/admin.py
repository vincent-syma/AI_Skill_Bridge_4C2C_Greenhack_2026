"""Admin endpoints — /api/v1/admin."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_admin
from app.core.db import get_db
from app.core.logging import get_logger
from app.models import Evaluation, Submission, Task, User
from app.models.enums import EvaluationStatus, SubmissionStatus
from app.schemas.auth import RoleUpdate, UserRead
from app.schemas.task import TaskCreate, TaskRead, TaskUpdate

router = APIRouter(prefix="/admin", tags=["admin"])
logger = get_logger(__name__)


@router.get("/analytics")
def analytics(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> dict:
    total_users = db.scalar(select(func.count()).select_from(User)) or 0
    total_projects = db.scalar(select(func.count()).select_from(Task)) or 0
    total_submissions = db.scalar(select(func.count()).select_from(Submission)) or 0
    completed = db.scalar(
        select(func.count()).select_from(Submission).where(
            Submission.status == SubmissionStatus.COMPLETED
        )
    ) or 0
    evals_done = db.scalar(
        select(func.count()).select_from(Evaluation).where(
            Evaluation.status.in_(
                [EvaluationStatus.SUBMITTED, EvaluationStatus.CONFIRMED]
            )
        )
    ) or 0
    return {
        "total_users": total_users,
        "total_projects": total_projects,
        "total_submissions": total_submissions,
        "completed_submissions": completed,
        "evaluations_done": evals_done,
    }


@router.get("/users", response_model=list[UserRead])
def list_users(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> list[User]:
    offset = (page - 1) * page_size
    return list(
        db.scalars(select(User).order_by(User.id).offset(offset).limit(page_size))
    )


@router.patch("/users/{user_id}", response_model=UserRead)
def update_user(
    user_id: int,
    data: RoleUpdate,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> User:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(404, "User not found")
    user.role = data.role
    db.commit()
    db.refresh(user)
    logger.info(
        "event=admin_user_role_updated admin_action=true target_user_id=%s new_role=%s",
        user.id,
        data.role.value,
    )
    return user


@router.post("/projects", response_model=TaskRead, status_code=201)
def create_project(
    data: TaskCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> Task:
    task = Task(**data.model_dump(), created_by=admin.id)
    db.add(task)
    db.commit()
    db.refresh(task)
    logger.info(
        "event=admin_project_created admin_id=%s task_id=%s title=%s",
        admin.id,
        task.id,
        task.title,
    )
    return task


@router.patch("/projects/{task_id}", response_model=TaskRead)
def update_project(
    task_id: int,
    data: TaskUpdate,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> Task:
    task = db.get(Task, task_id)
    if task is None:
        raise HTTPException(404, "Project not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(task, field, value)
    db.commit()
    db.refresh(task)
    logger.info(
        "event=admin_project_updated task_id=%s fields=%s status=%s",
        task.id,
        ",".join(sorted(data.model_dump(exclude_unset=True).keys())),
        task.status.value,
    )
    return task


@router.delete("/projects/{task_id}", status_code=204)
def delete_project(
    task_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
) -> None:
    task = db.get(Task, task_id)
    if task is None:
        raise HTTPException(404, "Project not found")
    from app.models.enums import TaskStatus
    task.status = TaskStatus.HIDDEN  # soft-delete: preserve submissions
    db.commit()
    logger.info(
        "event=admin_project_hidden task_id=%s action=soft_delete",
        task.id,
    )
