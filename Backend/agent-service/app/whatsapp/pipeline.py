from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Awaitable, Callable, Optional, Protocol

from app.agents.crisis_rumor import run_crisis_agent
from app.agents.job_offer import run_job_agent
from app.agents.rental_redflag import run_rental_agent
from app.agents.scam import run_scam_agent
from app.core.schemas import AgentType, CheckInput
from app.db.supabase_client import Timer, find_user_by_whatsapp, log_agent_run, save_check_for_user
from app.whatsapp.classifier import MessageClassification, classify_message, parse_command
from app.whatsapp.formatter import format_verdict_message
from app.whatsapp.session import get_session, reset_session, upsert_session
from app.whatsapp.vision import extract_text_from_whatsapp_screenshot

logger = logging.getLogger(__name__)

AGENT_RUNNERS = {
    "scam": run_scam_agent,
    "job_offer": run_job_agent,
    "crisis_rumor": run_crisis_agent,
    "rental_redflag": run_rental_agent,
}


class Messenger(Protocol):
    async def send_text(self, to: str, body: str) -> None: ...
    async def send_typing(self, to: str, message_id: str) -> None: ...


@dataclass(frozen=True)
class InboundMessage:
    phone: str
    message_id: str
    text: str = ""
    image_bytes: Optional[bytes] = None
    document_bytes: Optional[bytes] = None  # rental PDFs


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _help_text() -> str:
    return (
        "SafeLine can check 4 things:\n"
        "1) SCAM — suspicious SMS/links\n"
        "2) JOB — fake job offers\n"
        "3) CRISIS — forwarded emergency rumors\n"
        "4) RENTAL — one-sided rental clauses\n\n"
        "Send the message you want checked, or reply SCAM / JOB / CRISIS / RENTAL."
    )


def _disambiguation_prompt() -> str:
    return (
        "Which checker should I use?\n"
        "1) Scam message\n"
        "2) Fake job offer\n"
        "3) Crisis rumor\n"
        "4) Rental agreement\n\n"
        "Reply with 1–4 or SCAM/JOB/CRISIS/RENTAL."
    )


def _parse_agent_choice(text: str) -> Optional[AgentType]:
    t = (text or "").strip().lower()
    if t in {"1", "scam", "sms", "phish", "phishing", "kyc", "otp", "loan"}:
        return "scam"
    if t in {"2", "job", "jobs", "job_offer", "offer", "hiring", "recruiter"}:
        return "job_offer"
    if t in {"3", "crisis", "rumor", "rumours", "forward", "urgent"}:
        return "crisis_rumor"
    if t in {"4", "rental", "rent", "lease", "agreement", "tenant", "landlord"}:
        return "rental_redflag"
    return None


def _combine_buffer(items: list[dict]) -> str:
    parts: list[str] = []
    img_n = 0
    for it in items:
        typ = it.get("type")
        content = (it.get("content") or "").strip()
        if not content:
            continue
        if typ == "image":
            img_n += 1
            parts.append(f"[Image {img_n}]: {content}")
        else:
            parts.append(content)
    return "\n\n".join(parts).strip()


_debounce_tasks: dict[str, asyncio.Task[None]] = {}


async def _flush_and_classify(phone: str, message_id: str, messenger: Messenger) -> None:
    sess = await get_session(phone)
    buffer_items = sess.get("buffer") or []
    combined = _combine_buffer(buffer_items)
    await upsert_session(
        phone,
        buffer=[],
        buffer_started_at=None,
        last_message_at=None,
        state="idle",
    )
    if not combined:
        await messenger.send_text(phone, _help_text())
        return

    await _route_content(phone, message_id, combined, messenger, via="buffer_flush")


async def _route_content(
    phone: str,
    message_id: str,
    content_text: str,
    messenger: Messenger,
    *,
    via: str,
) -> None:
    timer = Timer()
    classification: MessageClassification = await classify_message(content_text)

    # Always log classification outcome to agent_runs with channel=whatsapp (even chitchat).
    # We need an AnnotatedVerdict to satisfy existing schema; for chitchat/ambiguous we'll log
    # a minimal "unverified" placeholder verdict.
    async def _log_placeholder(agent: AgentType, note: str) -> None:
        from app.core.schemas import AnnotatedVerdict

        verdict = AnnotatedVerdict(
            agent=agent,
            status="unverified",
            confidence=0.2,
            risk_score=45,
            red_flags=[],
            evidence=[],
            explanation=note,
            recommended_action="",
            needs_human_review=False,
            disclaimer="",
            input_text=content_text[:4000],
            flagged_spans=[],
        )
        user_id = await find_user_by_whatsapp(phone)
        await log_agent_run(
            agent=agent,
            channel="whatsapp",
            input_text=content_text,
            verdict=verdict,
            user_id=user_id,
            location={"router": {"mode": classification.mode, "agent_guess": classification.agent_guess, "confidence": classification.confidence, "via": via}},
            latency_ms=timer.elapsed_ms,
        )

    if classification.mode == "chitchat":
        await messenger.send_text(phone, _help_text())
        await _log_placeholder("scam", "chitchat")
        return

    if (
        classification.mode == "content_check"
        and classification.agent_guess
        and classification.confidence >= 0.75
    ):
        agent = classification.agent_guess
        inp = CheckInput(text=content_text)
        verdict = await AGENT_RUNNERS[agent](inp)
        user_id = await find_user_by_whatsapp(phone)
        await log_agent_run(
            agent=agent,
            channel="whatsapp",
            input_text=content_text,
            verdict=verdict,
            user_id=user_id,
            location={"router": {"mode": classification.mode, "agent_guess": classification.agent_guess, "confidence": classification.confidence, "via": via}},
            latency_ms=timer.elapsed_ms,
        )
        if user_id:
            await save_check_for_user(user_id, agent, content_text, verdict)
        await upsert_session(phone, last_agent=agent, state="idle", prompt_fail_count=0)
        await messenger.send_text(phone, format_verdict_message(verdict))
        return

    # Ambiguous: store pending and ask
    await upsert_session(
        phone,
        state="awaiting_agent_choice",
        pending_content=content_text[:8000],
        pending_media_type=None,
        prompt_fail_count=0,
    )
    await messenger.send_text(phone, _disambiguation_prompt())
    await _log_placeholder("scam", "ambiguous_needs_choice")


async def handle_inbound(message: InboundMessage, messenger: Messenger) -> None:
    phone = message.phone
    sess = await get_session(phone)
    state = sess.get("state") or "idle"

    # If user replies with a category while buffering (common when they preface with "2" etc),
    # flush buffered content and route directly.
    if state == "buffering":
        choice = _parse_agent_choice(message.text)
        if choice and (sess.get("buffer") or []):
            combined = _combine_buffer(sess.get("buffer") or [])
            await reset_session(phone)
            if not combined:
                await messenger.send_text(phone, _help_text())
                return
            timer = Timer()
            verdict = await AGENT_RUNNERS[choice](CheckInput(text=combined))
            user_id = await find_user_by_whatsapp(phone)
            await log_agent_run(
                agent=choice,
                channel="whatsapp",
                input_text=combined,
                verdict=verdict,
                user_id=user_id,
                location={"router": {"via": "buffer_choice"}},
                latency_ms=timer.elapsed_ms,
            )
            if user_id:
                await save_check_for_user(user_id, choice, combined, verdict)
            await messenger.send_text(phone, format_verdict_message(verdict))
            await upsert_session(phone, last_agent=choice, state="idle")
            return

    # If user is choosing after disambiguation
    if state == "awaiting_agent_choice":
        agent = _parse_agent_choice(message.text)
        if agent:
            pending = (sess.get("pending_content") or "").strip()
            await reset_session(phone)
            if not pending:
                await messenger.send_text(phone, _help_text())
                return
            timer = Timer()
            verdict = await AGENT_RUNNERS[agent](CheckInput(text=pending))
            user_id = await find_user_by_whatsapp(phone)
            await log_agent_run(
                agent=agent,
                channel="whatsapp",
                input_text=pending,
                verdict=verdict,
                user_id=user_id,
                location={"router": {"via": "agent_choice"}},
                latency_ms=timer.elapsed_ms,
            )
            if user_id:
                await save_check_for_user(user_id, agent, pending, verdict)
            await messenger.send_text(phone, format_verdict_message(verdict))
            return

        # invalid reply: re-prompt once, then reset
        fails = int(sess.get("prompt_fail_count") or 0) + 1
        if fails >= 2:
            await reset_session(phone)
            await messenger.send_text(phone, _help_text())
        else:
            await upsert_session(phone, prompt_fail_count=fails)
            await messenger.send_text(phone, _disambiguation_prompt())
        return

    # Rental documents: route immediately (skip buffering)
    if message.document_bytes:
        timer = Timer()
        verdict = await run_rental_agent(
            CheckInput(text=message.text or "Uploaded rental agreement PDF"),
            pdf_bytes=message.document_bytes,
        )
        user_id = await find_user_by_whatsapp(phone)
        await log_agent_run(
            agent="rental_redflag",
            channel="whatsapp",
            input_text=message.text or "Rental document",
            verdict=verdict,
            user_id=user_id,
            location={"router": {"via": "document"}},
            latency_ms=timer.elapsed_ms,
        )
        if user_id:
            await save_check_for_user(user_id, "rental_redflag", message.text, verdict)
        await messenger.send_text(phone, format_verdict_message(verdict))
        await upsert_session(phone, last_agent="rental_redflag", state="idle")
        return

    # Commands: deterministic routing / flushing
    cmd = parse_command(message.text)
    if cmd:
        if cmd.command in {"HELP", "MENU"}:
            await messenger.send_text(phone, _help_text())
            await reset_session(phone)
            return
        if cmd.command in {"CHECK", "DONE", "GO"}:
            await _flush_and_classify(phone, message.message_id, messenger)
            return
        if cmd.agent:
            # SCAM/JOB/CRISIS/RENTAL: flush buffer then run named agent; if no content, prompt.
            combined = _combine_buffer(sess.get("buffer") or [])
            if not combined and not (message.text.strip().upper() != cmd.command):
                await upsert_session(phone, state="buffering")
                await messenger.send_text(phone, "Send what you want me to check.")
                return
            if not combined:
                combined = message.text
            await reset_session(phone)
            timer = Timer()
            verdict = await AGENT_RUNNERS[cmd.agent](CheckInput(text=combined))
            user_id = await find_user_by_whatsapp(phone)
            await log_agent_run(
                agent=cmd.agent,
                channel="whatsapp",
                input_text=combined,
                verdict=verdict,
                user_id=user_id,
                location={"router": {"via": "command"}},
                latency_ms=timer.elapsed_ms,
            )
            if user_id:
                await save_check_for_user(user_id, cmd.agent, combined, verdict)
            await messenger.send_text(phone, format_verdict_message(verdict))
            await upsert_session(phone, last_agent=cmd.agent, state="idle")
            return

    # Non-command: buffering behavior (text or image).
    # Extract image text immediately (vision), so flush doesn't redo it.
    incoming_text = (message.text or "").strip()
    if message.image_bytes:
        incoming_text = await extract_text_from_whatsapp_screenshot(message.image_bytes)

    item_type = "image" if message.image_bytes else "text"
    buffer_items = list(sess.get("buffer") or [])
    buffer_items.append({"type": item_type, "content": incoming_text, "received_at": _now_iso()})
    buffer_started_at = sess.get("buffer_started_at") or _now_iso()
    await upsert_session(
        phone,
        state="buffering",
        buffer=buffer_items,
        buffer_started_at=buffer_started_at,
        last_message_at=_now_iso(),
    )

    # UX: typing indicator (best-effort)
    await messenger.send_typing(phone, message.message_id)

    # Caps: flush if too many items
    if len(buffer_items) >= 6:
        await _flush_and_classify(phone, message.message_id, messenger)
        return

    # Debounce task per phone
    existing = _debounce_tasks.get(phone)
    if existing and not existing.done():
        existing.cancel()

    async def _debounce() -> None:
        try:
            await asyncio.sleep(7)
            await _flush_and_classify(phone, message.message_id, messenger)
        except asyncio.CancelledError:
            return
        except Exception as exc:
            logger.warning("Debounce flush failed: %s", exc)

    _debounce_tasks[phone] = asyncio.create_task(_debounce())
