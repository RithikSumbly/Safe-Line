from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any, Optional, Protocol

from app.chat.orchestrator import HELP_TEXT, handle_chat_message
from app.core.schemas import ChatMessageResponse
from app.db.supabase_client import Timer, find_user_by_whatsapp, log_agent_run, save_check_for_user
from app.whatsapp.classifier import is_chitchat
from app.whatsapp.formatter import format_chat_response_for_whatsapp
from app.whatsapp.interactive import (
    MENU_CHECK_CRISIS,
    MENU_CHECK_JOB,
    MENU_CHECK_SCAM,
    MENU_HELP,
    MENU_IDS,
    MENU_OPEN,
    MENU_RESET,
    PROMPT_BY_CHECK,
    build_after_verdict_buttons,
    build_main_menu_interactive,
)
from app.whatsapp.session import (
    append_chat_turn,
    get_session,
    history_from_session,
    reset_session,
)
from app.whatsapp.vision import extract_text_from_screenshot

logger = logging.getLogger(__name__)


class Messenger(Protocol):
    async def send_text(self, to: str, body: str) -> None: ...
    async def send_typing(self, to: str, message_id: str) -> None: ...
    async def send_interactive(self, to: str, interactive: dict[str, Any]) -> None: ...


@dataclass(frozen=True)
class InboundMessage:
    phone: str
    message_id: str
    text: str = ""
    image_bytes: Optional[bytes] = None
    image_mime_type: Optional[str] = None
    document_bytes: Optional[bytes] = None


def _combine_caption_and_ocr(caption: str, extracted: str) -> str:
    """Match web chat: keep user caption + [Screenshot text] OCR block."""
    caption = (caption or "").strip()
    extracted = (extracted or "").strip()
    if caption and extracted:
        return f"{caption}\n\n[Screenshot text]: {extracted}"
    if extracted:
        return f"[Screenshot text]: {extracted}"
    return caption


async def _send_main_menu(messenger: Messenger, phone: str, *, preface: str | None = None) -> None:
    if preface:
        await messenger.send_text(phone, preface)
    try:
        await messenger.send_interactive(phone, build_main_menu_interactive())
    except Exception as exc:
        logger.warning("Interactive menu send failed, falling back to text: %s", exc)
        await messenger.send_text(
            phone,
            "Reply SCAM, JOB, or CRISIS — or just paste the suspicious message / screenshot.",
        )


async def _handle_menu_selection(
    phone: str,
    selection_id: str,
    messenger: Messenger,
) -> bool:
    """Handle WhatsApp list/button taps. Returns True if handled."""
    sid = selection_id.strip()
    if sid not in MENU_IDS:
        return False

    if sid in {MENU_OPEN, MENU_HELP}:
        preface = HELP_TEXT if sid == MENU_HELP else None
        await _send_main_menu(messenger, phone, preface=preface)
        await _safe_append_chat_turn(
            phone,
            sid,
            ChatMessageResponse(type="help", session_id=phone, assistant_text=preface or "Menu"),
        )
        return True

    if sid == MENU_RESET:
        await reset_session(phone, clear_history=True)
        await _send_main_menu(
            messenger,
            phone,
            preface=(
                "Chat reset. Previous messages won't affect the next check — "
                "paste a new message or pick an option below."
            ),
        )
        return True

    if sid in {MENU_CHECK_SCAM, MENU_CHECK_JOB, MENU_CHECK_CRISIS}:
        prompt = PROMPT_BY_CHECK[sid]
        await messenger.send_text(phone, prompt)
        await _safe_append_chat_turn(
            phone,
            sid,
            ChatMessageResponse(type="clarification", session_id=phone, assistant_text=prompt),
        )
        return True

    return False


async def handle_inbound(message: InboundMessage, messenger: Messenger) -> bool:
    """Process one inbound WhatsApp message. Returns True if a user-visible reply was sent."""
    phone = message.phone

    if message.document_bytes:
        await messenger.send_text(
            phone,
            "PDF/doc uploads are not supported. Please paste the text or send a screenshot/photo.",
        )
        return True

    incoming_text = (message.text or "").strip()

    # Interactive list/button ids arrive as plain text from the webhook mapper.
    if incoming_text in MENU_IDS and not message.image_bytes:
        return await _handle_menu_selection(phone, incoming_text, messenger)

    if message.image_bytes:
        try:
            await messenger.send_text(phone, "Reading your screenshot…")
        except Exception as exc:
            logger.debug("Screenshot ack skipped: %s", exc)
        extracted = await extract_text_from_screenshot(
            message.image_bytes,
            mime_type=message.image_mime_type or "image/jpeg",
        )
        incoming_text = _combine_caption_and_ocr(incoming_text, extracted)

    if not incoming_text:
        await _send_main_menu(messenger, phone, preface=HELP_TEXT)
        return True

    normalized = incoming_text.strip().upper()
    if normalized in {"RESET", "NEW", "CLEAR"}:
        await reset_session(phone, clear_history=True)
        await _send_main_menu(
            messenger,
            phone,
            preface=(
                "Chat reset. Previous messages won't affect the next check — "
                "paste a new message or pick an option below."
            ),
        )
        return True

    if normalized in {"MENU", "HELP"}:
        await _send_main_menu(
            messenger,
            phone,
            preface=HELP_TEXT if normalized == "HELP" else None,
        )
        await _safe_append_chat_turn(
            phone,
            incoming_text,
            ChatMessageResponse(type="help", session_id=phone, assistant_text=HELP_TEXT),
        )
        return True

    # Greetings — welcome + selectable menu.
    if is_chitchat(incoming_text) and not message.image_bytes:
        await _send_main_menu(messenger, phone, preface=HELP_TEXT)
        await _safe_append_chat_turn(
            phone,
            incoming_text,
            ChatMessageResponse(
                type="help",
                session_id=phone,
                assistant_text=HELP_TEXT,
            ),
        )
        return True

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
        return True

    body = format_chat_response_for_whatsapp(response)
    if not body:
        body = HELP_TEXT
    await messenger.send_text(phone, body)

    if response.type == "verdict":
        try:
            await messenger.send_interactive(phone, build_after_verdict_buttons())
        except Exception as exc:
            logger.debug("Post-verdict buttons skipped: %s", exc)

    await _safe_post_reply_bookkeeping(
        phone=phone,
        incoming_text=incoming_text,
        response=response,
        timer=timer,
    )
    return True


async def _safe_append_chat_turn(
    phone: str,
    user_text: str,
    response: ChatMessageResponse,
) -> None:
    try:
        await append_chat_turn(phone, user_text, response)
    except Exception as exc:
        logger.warning("WhatsApp session history update failed: %s", exc)


async def _safe_post_reply_bookkeeping(
    *,
    phone: str,
    incoming_text: str,
    response: ChatMessageResponse,
    timer: Timer,
) -> None:
    """Never fail the user-facing flow after we already sent a reply."""
    try:
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
    except Exception as exc:
        logger.exception("WhatsApp post-reply bookkeeping failed: %s", exc)
