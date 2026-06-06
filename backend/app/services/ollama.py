"""Thin client for local LLM backends.

Speaks two dialects, picked by URL suffix:
  - `/v1` or `/v1/`  → OpenAI-compatible (LM Studio, llama.cpp server, Ollama-compat)
  - anything else    → Ollama native (`/api/tags`, `/api/chat`)

Callers may pass an explicit base_url (per-user override stored in
`user.settings.ai_base_url`); otherwise the global default from `settings`
is used.
"""
from __future__ import annotations

import time
from typing import Any

import httpx
from fastapi import HTTPException

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

ChatMessage = dict[str, str]


def _resolve_base_url(override: str | None) -> str:
    raw = (override or settings.ollama_base_url or "").strip()
    return raw.rstrip("/")


def _is_openai_compat(base_url: str) -> bool:
    return base_url.endswith("/v1")


async def list_models(base_url: str | None = None) -> tuple[list[dict[str, str]], bool]:
    """Return (models, reachable). Empty list if the server is down."""
    if not settings.ai_playground_enabled:
        logger.info("event=ai_models_skipped reason=playground_disabled")
        return [], False

    base = _resolve_base_url(base_url)
    openai_mode = _is_openai_compat(base)
    url = f"{base}/models" if openai_mode else f"{base}/api/tags"
    logger.debug("event=ai_models_request url=%s mode=%s", url, "openai" if openai_mode else "ollama")
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            res = await client.get(url)
            res.raise_for_status()
            data = res.json()
    except (httpx.HTTPError, ValueError) as exc:
        logger.warning(
            "event=ai_models_unreachable url=%s error=%s",
            url,
            type(exc).__name__,
        )
        return [], False

    models: list[dict[str, str]] = []
    if openai_mode:
        for item in data.get("data") or []:
            name = item.get("id")
            if name:
                models.append({"id": name, "name": name})
    else:
        for item in data.get("models") or []:
            name = item.get("name") or item.get("model")
            if name:
                models.append({"id": name, "name": name})
    models.sort(key=lambda m: m["name"])
    logger.info(
        "event=ai_models_loaded count=%s url=%s mode=%s",
        len(models),
        url,
        "openai" if openai_mode else "ollama",
    )
    return models, True


async def chat(
    model: str,
    messages: list[ChatMessage],
    base_url: str | None = None,
) -> dict[str, Any]:
    if not settings.ai_playground_enabled:
        logger.warning("event=ai_chat_rejected reason=playground_disabled model=%s", model)
        raise HTTPException(503, "AI playground is disabled")

    base = _resolve_base_url(base_url)
    openai_mode = _is_openai_compat(base)
    if openai_mode:
        url = f"{base}/chat/completions"
        payload = {"model": model, "messages": messages, "stream": False}
    else:
        url = f"{base}/api/chat"
        payload = {"model": model, "messages": messages, "stream": False}

    logger.info(
        "event=ai_chat_begin model=%s message_count=%s prompt_chars=%s url=%s mode=%s",
        model,
        len(messages),
        sum(len(m.get("content") or "") for m in messages),
        url,
        "openai" if openai_mode else "ollama",
    )
    started = time.perf_counter()
    try:
        async with httpx.AsyncClient(timeout=180.0) as client:
            res = await client.post(url, json=payload)
            if res.status_code == 404:
                logger.warning(
                    "event=ai_chat_failed reason=model_not_found model=%s",
                    model,
                )
                raise HTTPException(404, f"Model not found: {model}")
            res.raise_for_status()
            data = res.json()
    except httpx.ConnectError:
        logger.error(
            "event=ai_chat_failed reason=connection_error url=%s model=%s",
            url,
            model,
        )
        raise HTTPException(
            503,
            "Cannot reach local AI. Start LM Studio / Ollama or update the URL in your profile.",
        ) from None
    except httpx.TimeoutException:
        logger.error(
            "event=ai_chat_failed reason=timeout model=%s timeout_seconds=180",
            model,
        )
        raise HTTPException(504, "Model timed out — try a smaller model or shorter prompt.")
    except httpx.HTTPStatusError as exc:
        detail = exc.response.text[:500] if exc.response else str(exc)
        logger.error(
            "event=ai_chat_failed reason=http_error model=%s status=%s detail=%s",
            model,
            exc.response.status_code if exc.response else "unknown",
            detail,
        )
        raise HTTPException(exc.response.status_code, detail) from exc

    if openai_mode:
        choices = data.get("choices") or []
        content = ""
        if choices:
            content = (choices[0].get("message") or {}).get("content") or ""
    else:
        message = data.get("message") or {}
        content = message.get("content") or ""
    duration_ms = int((time.perf_counter() - started) * 1000)
    logger.info(
        "event=ai_chat_success model=%s duration_ms=%s response_chars=%s",
        model,
        duration_ms,
        len(content),
    )
    return {
        "model": model,
        "content": content,
        "duration_ms": duration_ms,
    }
