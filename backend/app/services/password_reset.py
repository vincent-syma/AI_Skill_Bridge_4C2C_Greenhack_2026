"""Password reset token lifecycle."""
import datetime as dt
import hashlib
import secrets

from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.logging import get_logger
from app.models import PasswordResetToken, User

logger = get_logger(__name__)

RESET_MESSAGE = (
    "If an account exists for this email, we've sent password reset instructions. "
    "Check your inbox and spam folder. For your security, this response is the same "
    "whether or not the address is registered."
)


def _hash_token(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()


def _reset_url(raw_token: str) -> str:
    base = settings.frontend_url.rstrip("/")
    return f"{base}/?reset={raw_token}"


def issue_reset_token(db: Session, user: User) -> str:
    """Invalidate prior unused tokens and mint a new single-use reset link."""
    now = dt.datetime.now(dt.timezone.utc)
    invalidated = db.execute(
        update(PasswordResetToken)
        .where(
            PasswordResetToken.user_id == user.id,
            PasswordResetToken.used_at.is_(None),
            PasswordResetToken.expires_at > now,
        )
        .values(used_at=now)
    )
    raw = secrets.token_urlsafe(32)
    expires_at = now + dt.timedelta(minutes=settings.password_reset_expire_minutes)
    row = PasswordResetToken(
        user_id=user.id,
        token_hash=_hash_token(raw),
        expires_at=expires_at,
    )
    db.add(row)
    db.commit()
    logger.info(
        "event=password_reset_token_issued user_id=%s email=%s expires_at=%s invalidated_prior_tokens=%s expose_dev_link=%s",
        user.id,
        user.email,
        expires_at.isoformat(),
        invalidated.rowcount,
        settings.expose_password_reset_dev,
    )
    return raw


def request_password_reset(db: Session, email: str) -> str | None:
    """Create a reset token when the user exists. Always return None to caller."""
    normalized = email.strip()
    logger.info("event=password_reset_requested email=%s", normalized)
    user = db.scalar(
        select(User).where(func.lower(User.email) == normalized.lower())
    )
    if user is None:
        logger.info(
            "event=password_reset_no_account email=%s action=return_generic_response",
            normalized,
        )
        return None
    raw = issue_reset_token(db, user)
    url = _reset_url(raw)
    if settings.expose_password_reset_dev:
        logger.info(
            "event=password_reset_dev_link user_id=%s email=%s reset_url=%s",
            user.id,
            user.email,
            url,
        )
    else:
        logger.info(
            "event=password_reset_link_ready user_id=%s email=%s delivery=smtp_or_external",
            user.id,
            user.email,
        )
    return url if settings.expose_password_reset_dev else None


def consume_reset_token(db: Session, raw_token: str) -> User | None:
    """Validate token and return the owning user, or None if invalid/expired."""
    now = dt.datetime.now(dt.timezone.utc)
    row = db.scalar(
        select(PasswordResetToken).where(
            PasswordResetToken.token_hash == _hash_token(raw_token),
            PasswordResetToken.used_at.is_(None),
            PasswordResetToken.expires_at > now,
        )
    )
    if row is None:
        logger.warning("event=password_reset_token_invalid reason=missing_or_expired")
        return None
    user = db.get(User, row.user_id)
    logger.info(
        "event=password_reset_token_valid user_id=%s token_expires_at=%s",
        row.user_id,
        row.expires_at.isoformat(),
    )
    return user


def mark_token_used(db: Session, raw_token: str) -> None:
    now = dt.datetime.now(dt.timezone.utc)
    result = db.execute(
        update(PasswordResetToken)
        .where(PasswordResetToken.token_hash == _hash_token(raw_token))
        .values(used_at=now)
    )
    db.commit()
    logger.info(
        "event=password_reset_token_consumed rows_updated=%s used_at=%s",
        result.rowcount,
        now.isoformat(),
    )
