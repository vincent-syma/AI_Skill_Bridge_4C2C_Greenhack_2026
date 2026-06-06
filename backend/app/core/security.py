"""Security primitives: password hashing and JWT (access + refresh).

We use bcrypt directly (no passlib) to avoid passlib's noisy
bcrypt-version warnings and keep the dependency surface small.
Note: bcrypt silently truncates passwords beyond 72 bytes.

Two token kinds share one secret but carry a `type` claim so a refresh
token can never be used where an access token is expected, and vice versa.
"""
import datetime as dt

import bcrypt
import jwt

from app.core.config import settings


def hash_password(password: str) -> str:
    """Return a salted bcrypt hash, decoded to str for DB storage."""
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str) -> bool:
    """Constant-time check of a plaintext password against a stored hash."""
    return bcrypt.checkpw(password.encode(), hashed.encode())


def _create_token(
    subject: str | int, expires_delta: dt.timedelta, token_type: str
) -> str:
    now = dt.datetime.now(dt.timezone.utc)
    payload = {
        "sub": str(subject),
        "type": token_type,
        "iat": now,
        "exp": now + expires_delta,
    }
    return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)


def create_access_token(subject: str | int) -> str:
    return _create_token(
        subject,
        dt.timedelta(minutes=settings.access_token_expire_minutes),
        "access",
    )


def create_refresh_token(subject: str | int) -> str:
    return _create_token(
        subject,
        dt.timedelta(days=settings.refresh_token_expire_days),
        "refresh",
    )


def decode_token(token: str) -> dict:
    """Decode and verify a JWT. Raises jwt.PyJWTError on bad/expired tokens.

    The caller is responsible for checking the `type` claim.
    """
    return jwt.decode(
        token, settings.secret_key, algorithms=[settings.algorithm]
    )
