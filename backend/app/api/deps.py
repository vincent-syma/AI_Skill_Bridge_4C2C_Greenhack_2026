"""Reusable FastAPI dependencies for authentication and authorization.

get_current_user turns a Bearer access token into a User row (or 401).
require_roles builds a dependency that 403s unless the user holds one of
the listed roles. The two convenience gates fold admin into power-user
checks, since an admin can do anything a power user can.
"""
import datetime as dt

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.logging import get_logger
from app.core.security import decode_token
from app.models import User
from app.models.enums import UserRole

logger = get_logger(__name__)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/login")

# Only rewrite last_active when the previous beat is older than this, so a
# burst of requests from one user doesn't hammer the DB with writes.
_HEARTBEAT_THROTTLE = dt.timedelta(seconds=60)

_CREDENTIALS_EXC = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Could not validate credentials",
    headers={"WWW-Authenticate": "Bearer"},
)


def get_current_user(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
) -> User:
    try:
        payload = decode_token(token)
        if payload.get("type") != "access":  # refresh tokens are not valid here
            logger.warning("event=auth_rejected reason=wrong_token_type")
            raise _CREDENTIALS_EXC
        user_id = int(payload["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        logger.warning("event=auth_rejected reason=invalid_access_token")
        raise _CREDENTIALS_EXC

    user = db.get(User, user_id)
    if user is None:
        logger.warning(
            "event=auth_rejected reason=user_not_found user_id=%s",
            user_id,
        )
        raise _CREDENTIALS_EXC
    logger.debug(
        "event=auth_ok user_id=%s email=%s role=%s",
        user.id,
        user.email,
        user.role.value,
    )
    _beat_presence(db, user)
    return user


def _beat_presence(db: Session, user: User) -> None:
    """Throttled live-presence stamp used to surface 'available now' peers.

    Commits independently of the request so a failed write here never breaks
    auth; worst case the heartbeat is simply skipped this round.
    """
    now = dt.datetime.utcnow()
    last = user.last_active
    if last is not None and (now - last) < _HEARTBEAT_THROTTLE:
        return
    user.last_active = now
    try:
        db.commit()
    except Exception:  # presence is best-effort; don't 500 the request
        db.rollback()
        logger.warning("event=heartbeat_failed user_id=%s", user.id)


def require_roles(*roles: UserRole):
    def checker(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            logger.warning(
                "event=auth_forbidden user_id=%s role=%s required=%s",
                user.id,
                user.role.value,
                ",".join(r.value for r in roles),
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )
        return user

    return checker


require_power_user = require_roles(UserRole.POWER_USER, UserRole.ADMIN)
require_admin = require_roles(UserRole.ADMIN)
