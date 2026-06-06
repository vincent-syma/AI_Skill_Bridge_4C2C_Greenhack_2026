"""Authentication endpoints.

Login returns an access token in the JSON body AND sets the refresh token
as an httpOnly cookie scoped to /auth (so it's only sent to refresh/logout,
never to data routes). Refresh reads that cookie and mints a new access
token, sliding the refresh cookie forward.
"""
import datetime as dt

import jwt
from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.db import get_db
from app.core.logging import display_user, get_logger, log_user_journey
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.models import User
from app.schemas.auth import (
    ChangePasswordRequest,
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    MessageResponse,
    ResetPasswordRequest,
    Token,
    UserCreate,
    UserRead,
)
from app.services.password_reset import (
    RESET_MESSAGE,
    consume_reset_token,
    mark_token_used,
    request_password_reset,
)

router = APIRouter(prefix="/auth", tags=["auth"])
logger = get_logger(__name__)


def _set_refresh_cookie(response: Response, user_id: int) -> None:
    response.set_cookie(
        key=settings.refresh_cookie_name,
        value=create_refresh_token(user_id),
        httponly=True,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
        max_age=settings.refresh_token_expire_days * 24 * 3600,
        path="/api/v1/auth",
    )


@router.post("/register", response_model=UserRead, status_code=201)
def register(data: UserCreate, db: Session = Depends(get_db)) -> User:
    logger.info(
        "event=register_attempt email=%s name=%s department=%s",
        data.email,
        data.name,
        data.department,
    )
    if db.scalar(select(User).where(User.email == data.email)):
        raise HTTPException(status_code=409, detail="Email already registered")
    user = User(
        email=data.email,
        password_hash=hash_password(data.password),
        name=data.name,
        department=data.department,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    label = display_user(user)
    logger.info(
        "event=register_success user_id=%s email=%s role=%s",
        user.id,
        user.email,
        user.role.value,
    )
    log_user_journey(
        logger,
        "user_registered",
        f"User {label} just created their account.",
        user_id=user.id,
        email=user.email,
        role=user.role.value,
    )
    if data.department:
        log_user_journey(
            logger,
            "user_department_selected",
            f"User {label} selected {data.department} in their onboarding form.",
            user_id=user.id,
            department=data.department,
            previous_department="-",
            source="register",
        )
    return user


@router.post("/login", response_model=Token)
def login(
    response: Response,
    form: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
) -> Token:
    logger.info("event=login_attempt email=%s", form.username)
    user = db.scalar(select(User).where(User.email == form.username))
    if user is None or not verify_password(form.password, user.password_hash):
        logger.warning(
            "event=login_failed email=%s reason=invalid_credentials",
            form.username,
        )
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    _set_refresh_cookie(response, user.id)
    label = display_user(user)
    created = user.created_at
    first_login = False
    if created is not None:
        if created.tzinfo is None:
            created = created.replace(tzinfo=dt.timezone.utc)
        first_login = (dt.datetime.now(dt.timezone.utc) - created).total_seconds() < 3600
    login_desc = (
        f"User {label} just signed in for the first time."
        if first_login
        else f"User {label} signed in."
    )
    log_user_journey(
        logger,
        "user_logged_in",
        login_desc,
        user_id=user.id,
        email=user.email,
        role=user.role.value,
        department=user.department or "-",
        first_login=first_login,
    )
    return Token(access_token=create_access_token(user.id))


@router.post("/refresh", response_model=Token)
def refresh(
    response: Response,
    db: Session = Depends(get_db),
    refresh_token: str | None = Cookie(default=None),
) -> Token:
    cred_exc = HTTPException(status_code=401, detail="Invalid refresh token")
    if not refresh_token:
        logger.warning("event=refresh_failed reason=missing_cookie")
        raise cred_exc
    try:
        payload = decode_token(refresh_token)
        if payload.get("type") != "refresh":
            logger.warning("event=refresh_failed reason=wrong_token_type")
            raise cred_exc
        user_id = int(payload["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        logger.warning("event=refresh_failed reason=invalid_token")
        raise cred_exc

    user = db.get(User, user_id)
    if user is None:
        logger.warning(
            "event=refresh_failed reason=user_not_found user_id=%s",
            user_id,
        )
        raise cred_exc
    _set_refresh_cookie(response, user.id)
    logger.info(
        "event=refresh_success user_id=%s email=%s",
        user.id,
        user.email,
    )
    return Token(access_token=create_access_token(user.id))


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(response: Response) -> None:
    response.delete_cookie(settings.refresh_cookie_name, path="/api/v1/auth")
    logger.info("event=logout cookie_cleared=true")


@router.get("/me", response_model=UserRead)
def me(user: User = Depends(get_current_user)) -> User:
    logger.debug(
        "event=auth_me user_id=%s email=%s xp=%s level=%s",
        user.id,
        user.email,
        user.xp,
        user.xp // 500,
    )
    return user


@router.post("/forgot-password", response_model=ForgotPasswordResponse)
def forgot_password(
    data: ForgotPasswordRequest, db: Session = Depends(get_db)
) -> ForgotPasswordResponse:
    """Request a reset link. Response is identical whether the email exists."""
    dev_url = request_password_reset(db, data.email.strip())
    logger.info(
        "event=forgot_password_handled email=%s dev_url_returned=%s",
        data.email.strip(),
        dev_url is not None,
    )
    return ForgotPasswordResponse(message=RESET_MESSAGE, dev_reset_url=dev_url)


@router.post("/reset-password", response_model=MessageResponse)
def reset_password(
    data: ResetPasswordRequest,
    response: Response,
    db: Session = Depends(get_db),
) -> MessageResponse:
    user = consume_reset_token(db, data.token)
    if user is None:
        raise HTTPException(
            status_code=400,
            detail="This reset link is invalid or has expired. Request a new one.",
        )
    user.password_hash = hash_password(data.password)
    mark_token_used(db, data.token)
    db.commit()
    response.delete_cookie(settings.refresh_cookie_name, path="/api/v1/auth")
    logger.info(
        "event=password_reset_complete user_id=%s email=%s sessions_cleared=true",
        user.id,
        user.email,
    )
    return MessageResponse(
        message="Password updated. Sign in with your new password."
    )


@router.post("/change-password", response_model=MessageResponse)
def change_password(
    data: ChangePasswordRequest,
    response: Response,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> MessageResponse:
    if not verify_password(data.current_password, user.password_hash):
        logger.warning(
            "event=change_password_failed user_id=%s reason=wrong_current_password",
            user.id,
        )
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if data.current_password == data.new_password:
        logger.warning(
            "event=change_password_failed user_id=%s reason=same_password",
            user.id,
        )
        raise HTTPException(
            status_code=400,
            detail="New password must be different from your current password",
        )
    user.password_hash = hash_password(data.new_password)
    db.commit()
    response.delete_cookie(settings.refresh_cookie_name, path="/api/v1/auth")
    logger.info(
        "event=change_password_success user_id=%s email=%s sessions_cleared=true",
        user.id,
        user.email,
    )
    return MessageResponse(
        message="Password updated. Other sessions have been signed out for security."
    )
