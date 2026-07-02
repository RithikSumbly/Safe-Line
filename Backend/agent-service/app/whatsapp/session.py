from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Optional, TypedDict, Literal, cast

from app.db.supabase_client import get_supabase

logger = logging.getLogger(__name__)

SessionState = Literal["idle", "awaiting_agent_choice", "buffering"]


class BufferItem(TypedDict):
    type: Literal["text", "image"]
    content: str
    received_at: str


DEFAULT_SESSION: dict[str, Any] = {
    "state": "idle",
    "pending_content": None,
    "pending_media_type": None,
    "prompt_fail_count": 0,
    "buffer": [],
    "buffer_started_at": None,
    "last_message_at": None,
}

# In-memory fallback when Supabase not configured (tests/local dev).
_MEM: dict[str, dict[str, Any]] = {}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


async def get_session(phone: str) -> dict[str, Any]:
    client = get_supabase()
    if not client:
        return {**DEFAULT_SESSION, **_MEM.get(phone, {}), "phone": phone}
    try:
        res = (
            client.table("whatsapp_sessions")
            .select("*")
            .eq("phone", phone)
            .maybe_single()
            .execute()
        )
        data = cast(dict[str, Any] | None, res.data) or {}
        if not data:
            return {**DEFAULT_SESSION, "phone": phone}
        # Ensure defaults for forward-compat.
        return {**DEFAULT_SESSION, **data}
    except Exception:
        return {**DEFAULT_SESSION, **_MEM.get(phone, {}), "phone": phone}


async def upsert_session(phone: str, **fields: Any) -> None:
    client = get_supabase()
    if not client:
        prev = _MEM.get(phone, {})
        _MEM[phone] = {**prev, **fields, "phone": phone, "updated_at": _now_iso()}
        return
    payload: dict[str, Any] = {"phone": phone, "updated_at": "now()", **fields}
    try:
        client.table("whatsapp_sessions").upsert(payload).execute()
    except Exception as exc:
        logger.warning("Session upsert failed: %s", exc)


async def reset_session(phone: str) -> None:
    await upsert_session(
        phone,
        state="idle",
        pending_content=None,
        pending_media_type=None,
        prompt_fail_count=0,
        buffer=[],
        buffer_started_at=None,
        last_message_at=None,
    )
