from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Optional, Protocol

from app.chat.orchestrator import HELP_TEXT, handle_chat_message
from app.core.schemas import ChatMessageResponse
from app.db.supabase_client import Timer, find_user_by_whatsapp, log_agent_run, save_check_for_user
from app.whatsapp.classifier import is_chitchat
from app.whatsapp.formatter import format_chat_response_for_whatsapp
from app.whatsapp.session import (
    append_chat_turn,
    get_session,
    history_from_session,
    reset_session,
)
from app.whatsapp.vision import extract_text_from_whatsapp_screenshot

logger = logging.getLogger(__name__)


class Messenger(Protocol):
    async def send_text(self, to: str, body: str) -> None: ...
    async def send_typing(self, to: str, message_id: str) -> None: ...


@dataclass(frozen=True)
class InboundMessage:
    phone: str
    message_id: str
    text: str = ""
    image_bytes: Optional[bytes] = None
    document_bytes: Optional[bytes] = None


async def handle_inbound(message: InboundMessage, messenger: Messenger) -> None:
    """Route WhatsApp messages through the same orchestrator as web /chat."""
    phone = message.phone

    if message.document_bytes:
        await messenger.send_text(
            phone,
            "PDF/doc uploads are not supported. Please paste the text you want checked.",
        )
        return

    incoming_text = (message.text or "").strip()
    if message.image_bytes:
        extracted = await extract_text_from_whatsapp_screenshot(message.image_bytes)
        incoming_text = f"[Image]: {extracted}" if extracted else incoming_text

    if not incoming_text:
        await messenger.send_text(phone, HELP_TEXT)
        return

    normalized = incoming_text.strip().upper()
    if normalized in {"RESET", "NEW", "CLEAR"}:
        await reset_session(phone, clear_history=True)
        await messenger.send_text(
            phone,
            f"Started a new conversation.\n\n{HELP_TEXT}",
        )
        return

    # Greetings — instant reply without waiting on the LLM orchestrator.
    if is_chitchat(incoming_text) and not message.image_bytes:
        help_response = ChatMessageResponse(
            type="help",
            session_id=phone,
            assistant_text=HELP_TEXT,
        )
        await messenger.send_text(phone, HELP_TEXT)
        await append_chat_turn(phone, incoming_text, help_response)
        return

    await messenger.send_typing(phone, message.message_id)

    sess = await get_session(phone)
    history = history_from_session(sess)
    timer = Timer()

    try:
        response = await handle_chat_message(incoming_text, history, phone)
    except Exception as exc:
        logger.exception("WhatsApp orchestrator failed: %s", exc)
        await messenger.send_text(
            phone,
            "I couldn't process that right now. Please try again in a moment.",
        )
        return

    body = format_chat_response_for_whatsapp(response)
    if not body:
        body = HELP_TEXT
    await messenger.send_text(phone, body)
    await append_chat_turn(phone, incoming_text, response)

    if response.type == "verdict" and response.verdict:
        user_id = await find_user_by_whatsapp(phone)
        await log_agent_run(
            agent=response.verdict.agent,
            channel="whatsapp",
            input_text=incoming_text,
            verdict=response.verdict,
            user_id=user_id,
            location={
                "orchestrator": {
                    "tool_used": response.tool_used,
                    "channel": "whatsapp",
                }
            },
            latency_ms=timer.elapsed_ms,
        )
        if user_id:
            await save_check_for_user(
                user_id,
                response.verdict.agent,
                incoming_text,
                response.verdict,
            )
        await reset_session(phone, clear_history=False)
