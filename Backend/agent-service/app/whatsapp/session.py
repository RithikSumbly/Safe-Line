from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Literal, TypedDict, cast

from app.core.schemas import ChatHistoryItem, ChatMessageResponse
from app.db.supabase_client import get_supabase

logger = logging.getLogger(__name__)

SessionState = Literal["idle", "awaiting_agent_choice", "buffering"]

MAX_CHAT_HISTORY = 16


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
    "chat_history": [],
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


def history_from_session(sess: dict[str, Any]) -> list[ChatHistoryItem]:
    raw = sess.get("chat_history") or []
    items: list[ChatHistoryItem] = []
    for row in raw:
        if not isinstance(row, dict):
            continue
        role = row.get("role")
        content = row.get("content")
        if role in ("user", "assistant") and isinstance(content, str):
            items.append(ChatHistoryItem(role=role, content=content))
    return items[-MAX_CHAT_HISTORY:]


def _assistant_history_content(response: ChatMessageResponse) -> str:
    if response.verdict:
        return (
            f"{response.assistant_text}\n[Verdict: {response.verdict.status}]"
        )
    return response.assistant_text


async def append_chat_turn(
    phone: str,
    user_text: str,
    response: ChatMessageResponse,
) -> None:
    sess = await get_session(phone)
    history = list(sess.get("chat_history") or [])
    history.append({"role": "user", "content": user_text[:4000]})
    history.append(
        {
            "role": "assistant",
            "content": _assistant_history_content(response)[:4000],
        }
    )
    await upsert_session(
        phone,
        chat_history=history[-MAX_CHAT_HISTORY:],
        state="idle",
        last_message_at=_now_iso(),
    )


async def reset_session(phone: str, *, clear_history: bool = True) -> None:
    fields: dict[str, Any] = {
        "state": "idle",
        "pending_content": None,
        "pending_media_type": None,
        "prompt_fail_count": 0,
        "buffer": [],
        "buffer_started_at": None,
        "last_message_at": None,
    }
    if clear_history:
        fields["chat_history"] = []
    await upsert_session(phone, **fields)
