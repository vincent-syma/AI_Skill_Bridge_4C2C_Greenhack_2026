"""Central logging setup for the API.

Call setup_logging() once at startup. Everywhere else:

    from app.core.logging import get_logger
    logger = get_logger(__name__)
"""
from __future__ import annotations

import json
import logging
import sys
import time
import uuid
from contextvars import ContextVar
from datetime import datetime, timezone
from typing import Callable

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.core.config import settings

_request_id: ContextVar[str | None] = ContextVar("request_id", default=None)

NOISY_LOGGERS = ("uvicorn.access",)


class RequestContextFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = _request_id.get() or "-"
        return True


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, object] = {
            "timestamp": datetime.fromtimestamp(
                record.created, tz=timezone.utc
            ).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "request_id": getattr(record, "request_id", "-"),
        }
        if event := getattr(record, "event", None):
            payload["event"] = event
        if description := getattr(record, "description", None):
            payload["description"] = description
        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)
        return json.dumps(payload, ensure_ascii=True)


def setup_logging() -> None:
    """Configure root logging once. Safe to call multiple times."""
    level = getattr(logging, settings.log_level.upper(), logging.DEBUG)

    handler = logging.StreamHandler(sys.stdout)
    handler.addFilter(RequestContextFilter())
    if settings.log_json:
        handler.setFormatter(JsonFormatter())
    else:
        handler.setFormatter(
            logging.Formatter(
                "%(asctime)s %(levelname)s [%(request_id)s] %(name)s: %(message)s"
            )
        )

    root = logging.getLogger()
    root.handlers.clear()
    root.setLevel(level)
    root.addHandler(handler)

    for name in ("uvicorn", "uvicorn.error", *NOISY_LOGGERS):
        logger = logging.getLogger(name)
        logger.handlers.clear()
        logger.propagate = True
        logger.setLevel(level)

    if settings.log_access:
        logging.getLogger("uvicorn.access").setLevel(level)
    else:
        logging.getLogger("uvicorn.access").setLevel(logging.WARNING)

    logging.getLogger("app").info(
        "event=logging_configured level=%s json=%s access=%s database=%s",
        settings.log_level.upper(),
        settings.log_json,
        settings.log_access,
        settings.database_url.split("@")[-1],
    )


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)


def display_user(
    user: object | None = None,
    *,
    user_id: int | None = None,
    email: str | None = None,
    name: str | None = None,
) -> str:
    """Human-readable label for logs (name, else email, else user #id)."""
    if user is not None:
        label = getattr(user, "name", None) or getattr(user, "email", None)
        if label:
            return str(label)
        return f"user #{user.id}"
    if name:
        return str(name)
    if email:
        return str(email)
    if user_id is not None:
        return f"user #{user_id}"
    return "unknown user"


def log_user_journey(
    logger: logging.Logger,
    event: str,
    description: str,
    *,
    level: int = logging.INFO,
    **fields: object,
) -> None:
    """Structured user-journey log with a verbose human description."""
    safe_desc = description.replace('"', "'").replace("\n", " ").strip()
    field_parts = " ".join(f"{key}={value}" for key, value in fields.items())
    message = f"event={event} {field_parts} description=\"{safe_desc}\"".strip()
    logger.log(level, message, extra={"event": event, "description": safe_desc})


def bind_request_id(request_id: str) -> None:
    _request_id.set(request_id)


def current_request_id() -> str | None:
    return _request_id.get()


def _request_target(request: Request) -> str:
    path = request.url.path
    if request.url.query:
        return f"{path}?{request.url.query}"
    return path


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Log each HTTP request with duration, status, and route context."""

    def __init__(self, app, logger_name: str = "app.request") -> None:
        super().__init__(app)
        self.logger = get_logger(logger_name)

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        request_id = request.headers.get("X-Request-ID") or uuid.uuid4().hex
        bind_request_id(request_id)
        started = time.perf_counter()

        client = request.client.host if request.client else "-"
        target = _request_target(request)
        user_agent = request.headers.get("user-agent", "-")[:120]

        self.logger.info(
            "event=request_started method=%s path=%s client=%s user_agent=%s",
            request.method,
            target,
            client,
            user_agent,
        )

        try:
            response = await call_next(request)
        except Exception:
            duration_ms = (time.perf_counter() - started) * 1000
            self.logger.exception(
                "event=request_failed method=%s path=%s client=%s duration_ms=%.1f",
                request.method,
                target,
                client,
                duration_ms,
            )
            raise

        duration_ms = (time.perf_counter() - started) * 1000
        response.headers["X-Request-ID"] = request_id
        log_fn = self.logger.warning if response.status_code >= 400 else self.logger.info
        log_fn(
            "event=request_completed method=%s path=%s status=%s duration_ms=%.1f client=%s",
            request.method,
            target,
            response.status_code,
            duration_ms,
            client,
        )
        return response
