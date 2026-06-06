"""Application entrypoint. All routers mount under /api/v1."""
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api import auth, evaluations, submissions, tasks, users
from app.api import (
    admin,
    ai_playground,
    ai_usage,
    availability,
    meta,
    notifications,
    peer_evaluations,
    projects,
    showcase,
    teams,
)
from app.core.config import settings
from app.core.db import init_db
from app.core.logging import RequestLoggingMiddleware, get_logger, setup_logging

V1 = "/api/v1"
setup_logging()
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(
        "event=app_startup_begin version=%s cors_origins=%s ai_playground=%s",
        app.version,
        len(settings.cors_origins),
        settings.ai_playground_enabled,
    )
    init_db()
    logger.info("event=app_startup_complete routes=%s", len(app.routes))
    yield
    logger.info("event=app_shutdown")


app = FastAPI(
    title="AI Skill Bridge API",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# allow_credentials=True is required for the refresh cookie; it forbids the
# "*" origin, so origins must be listed explicitly (see settings.cors_origins).
app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(HTTPException)
async def log_http_exceptions(request: Request, exc: HTTPException) -> JSONResponse:
    detail = exc.detail if isinstance(exc.detail, str) else str(exc.detail)
    if exc.status_code >= 500:
        logger.error(
            "event=http_error status=%s detail=%s method=%s path=%s",
            exc.status_code,
            detail,
            request.method,
            request.url.path,
        )
    elif exc.status_code >= 400:
        logger.warning(
            "event=http_error status=%s detail=%s method=%s path=%s",
            exc.status_code,
            detail,
            request.method,
            request.url.path,
        )
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})


@app.exception_handler(Exception)
async def log_unhandled_exceptions(request: Request, exc: Exception) -> JSONResponse:
    logger.exception(
        "event=unhandled_exception method=%s path=%s exc_type=%s",
        request.method,
        request.url.path,
        type(exc).__name__,
    )
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})

# ── /api/v1 routers ────────────────────────────────────────────────────────
app.include_router(auth.router, prefix=V1)
app.include_router(users.router, prefix=V1)
app.include_router(projects.router, prefix=V1)
app.include_router(peer_evaluations.router, prefix=V1)
app.include_router(availability.router, prefix=V1)
app.include_router(showcase.router, prefix=V1)
app.include_router(notifications.router, prefix=V1)
app.include_router(meta.router, prefix=V1)
app.include_router(teams.router, prefix=V1)
app.include_router(ai_usage.router, prefix=V1)
app.include_router(ai_playground.router, prefix=V1)
app.include_router(admin.router, prefix=V1)

# ── legacy routers (no /api/v1 prefix) kept for the demo script ────────────
app.include_router(tasks.router)
app.include_router(submissions.router)
app.include_router(evaluations.router)


@app.get("/health")
def health() -> dict[str, str]:
    logger.debug("event=health_check status=ok")
    return {"status": "ok"}
