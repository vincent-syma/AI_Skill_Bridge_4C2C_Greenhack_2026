"""AI playground — run workshop prompts against a local LLM.

Honors a per-user override stored in `user.settings.ai_base_url` so different
users can point at LM Studio, Ollama, or any other OpenAI-compatible server
on their own machine without changing global config.
"""
from typing import Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.logging import get_logger
from app.models import User
from app.services import ollama

router = APIRouter(prefix="/ai/playground", tags=["ai-playground"])
logger = get_logger(__name__)


def _user_base_url(user: User) -> str | None:
    s = user.settings or {}
    raw = s.get("ai_base_url")
    if isinstance(raw, str) and raw.strip():
        return raw.strip()
    return None


class ChatMessageIn(BaseModel):
    role: Literal["system", "user", "assistant"]
    content: str = Field(min_length=1)


class PlaygroundChatRequest(BaseModel):
    model: str = Field(min_length=1)
    messages: list[ChatMessageIn] = Field(min_length=1)


class PlaygroundTestRequest(BaseModel):
    base_url: str = Field(min_length=1)


@router.get("/models")
async def playground_models(
    user: User = Depends(get_current_user),
) -> dict:
    base_url = _user_base_url(user)
    effective = base_url or settings.ollama_base_url
    logger.debug(
        "event=playground_models_request user_id=%s base_url=%s override=%s",
        user.id,
        effective,
        bool(base_url),
    )
    models, reachable = await ollama.list_models(base_url)
    logger.debug(
        "event=playground_models_response user_id=%s reachable=%s model_count=%s",
        user.id,
        reachable,
        len(models),
    )
    return {
        "reachable": reachable,
        "base_url": effective,
        "user_override": bool(base_url),
        "models": models,
    }


@router.post("/chat")
async def playground_chat(
    body: PlaygroundChatRequest,
    user: User = Depends(get_current_user),
) -> dict:
    messages = [m.model_dump() for m in body.messages]
    logger.info(
        "event=playground_chat_request user_id=%s model=%s message_count=%s",
        user.id,
        body.model,
        len(messages),
    )
    return await ollama.chat(body.model, messages, _user_base_url(user))


@router.post("/test")
async def playground_test(
    body: PlaygroundTestRequest,
    user: User = Depends(get_current_user),
) -> dict:
    """Ping a candidate base_url without persisting anything.

    Used by the "Connect Local LLM" button in the profile so users can see
    whether the URL works before saving it to their settings.
    """
    logger.info(
        "event=playground_test_request user_id=%s base_url=%s",
        user.id,
        body.base_url,
    )
    models, reachable = await ollama.list_models(body.base_url)
    logger.info(
        "event=playground_test_response user_id=%s reachable=%s model_count=%s",
        user.id,
        reachable,
        len(models),
    )
    return {
        "reachable": reachable,
        "base_url": body.base_url.strip().rstrip("/"),
        "models": models,
    }
