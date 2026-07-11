from __future__ import annotations

import logging
import re
from typing import Literal, Optional

from pydantic import BaseModel, Field

from app.chat.agent_tools import execute_tool, extract_email
from app.core.llm_client import get_llm_client
from app.core.schemas import (
    AnnotatedVerdict,
    ChatHistoryItem,
    ChatMessageResponse,
    ChatMessageType,
    ChatToolName,
)
from app.router_agent import classify_intent
from app.tools.url_extract import extract_urls

logger = logging.getLogger(__name__)

HELP_TEXT = (
    "I'm SafeLine — paste or forward any suspicious message and I'll check it. "
    "I can verify scam texts, fake job offers, and crisis rumors using live sources. "
    "Just send the message you want checked."
)

LOC_RE = re.compile(r"\b(\d{1,3}\.\d+,\s*\d{1,3}\.\d+)\b")


class ToolCallArgs(BaseModel):
    text: str = Field(description="The suspicious message content to verify")
    url: Optional[str] = Field(default=None, description="Suspicious URL if present")
    email: Optional[str] = Field(default=None, description="Sender email if job-related")
    location: Optional[str] = Field(default=None, description="Location for crisis claims")


class OrchestratorDecision(BaseModel):
    action: Literal["call_tool", "reply"] = Field(
        description="call_tool when user wants content checked; reply for help/clarification"
    )
    tool_name: Optional[ChatToolName] = Field(
        default=None,
        description="Which checker tool to invoke when action is call_tool",
    )
    tool_args: Optional[ToolCallArgs] = None
    reply_type: Literal["clarification", "help", "text"] = "text"
    assistant_text: str = Field(
        description="Short conversational reply; intro before verdict or clarifying question"
    )


def _content_to_check(text: str, history: list[ChatHistoryItem]) -> str:
    """Use latest user text, or refer back to prior user message for follow-ups."""
    stripped = text.strip()
    if len(stripped) >= 40:
        return stripped
    for item in reversed(history):
        if item.role == "user" and len(item.content.strip()) >= 20:
            return item.content.strip()
    return stripped


def _detect_location(text: str) -> Optional[str]:
    m = LOC_RE.search(text)
    return m.group(1) if m else None


async def handle_chat_message(
    text: str,
    history: list[ChatHistoryItem],
    session_id: str,
) -> ChatMessageResponse:
    urls = extract_urls(text)
    content = _content_to_check(text, history)
    router_hint = await classify_intent(content)

    history_block = "\n".join(
        f"{m.role}: {m.content[:500]}" for m in history[-8:]
    )
    url_note = f"\nDetected URLs: {', '.join(urls)}" if urls else ""
    hint_note = (
        f"\nRouter hint: likely {router_hint.intent} (confidence {router_hint.confidence:.2f})"
        if router_hint.confidence >= 0.5
        else ""
    )

    system = (
        "You are SafeLine, a trust & safety chat assistant. "
        "You have three tools:\n"
        "- check_scam_message: phishing SMS, fake bank/KYC alerts, suspicious links, UPI scams\n"
        "- check_job_offer: fake hiring, registration fees, recruiter impersonation\n"
        "- check_crisis_rumor: forwarded disaster/evacuation/dam/flood rumors\n\n"
        "When the user forwards suspicious content to verify, set action=call_tool and pick the right tool. "
        "Put the full suspicious message in tool_args.text. "
        "If URLs were detected, pass the first into tool_args.url for scam checks. "
        "If an email appears, pass it in tool_args.email for job checks. "
        "For crisis checks, pass coordinates in tool_args.location if present.\n\n"
        "If the user only says hi/help or it's unclear what to check, set action=reply. "
        "Do not invent evidence. Keep assistant_text to 1-3 sentences."
    )

    user_prompt = (
        f"Conversation:\n{history_block}\n\n"
        f"Latest user message:\n{text}{url_note}{hint_note}\n\n"
        f"Content to check (if applicable):\n{content}"
    )

    decision = OrchestratorDecision(
        action="reply",
        reply_type="help",
        assistant_text=HELP_TEXT,
    )
    try:
        llm = get_llm_client()
        decision = await llm.structured_json(
            system=system,
            user=user_prompt,
            schema=OrchestratorDecision,
        )
    except Exception as exc:
        logger.warning("Orchestrator LLM failed: %s", exc)
        if router_hint.confidence >= 0.6 and router_hint.intent != "general_help":
            tool_map: dict[str, ChatToolName] = {
                "scam": "check_scam_message",
                "job_offer": "check_job_offer",
                "crisis_rumor": "check_crisis_rumor",
            }
            tool_name = tool_map.get(router_hint.intent)
            if tool_name:
                decision = OrchestratorDecision(
                    action="call_tool",
                    tool_name=tool_name,
                    tool_args=ToolCallArgs(
                        text=content,
                        url=urls[0] if urls else None,
                        email=extract_email(content),
                        location=_detect_location(content),
                    ),
                    assistant_text="Running a live check on that message now.",
                )
        elif re.match(r"(?i)^(hi|hello|hey|help|start)\b", text.strip()):
            return ChatMessageResponse(
                type="help",
                session_id=session_id,
                assistant_text=HELP_TEXT,
            )
        else:
            return ChatMessageResponse(
                type="clarification",
                session_id=session_id,
                assistant_text=(
                    router_hint.clarifying_question
                    or "Paste the suspicious message you'd like me to check."
                ),
            )

    if decision.action == "reply":
        msg_type: ChatMessageType = (
            "help" if decision.reply_type == "help" else "clarification"
        )
        return ChatMessageResponse(
            type=msg_type,
            session_id=session_id,
            assistant_text=decision.assistant_text or HELP_TEXT,
        )

    if not decision.tool_name or not decision.tool_args:
        return ChatMessageResponse(
            type="clarification",
            session_id=session_id,
            assistant_text=decision.assistant_text
            or "Paste the full suspicious message and I'll run a live check.",
        )

    args = decision.tool_args
    check_text = args.text or content
    check_url = args.url or (urls[0] if urls else None)
    check_email = args.email or extract_email(check_text)
    check_location = args.location or _detect_location(text) or _detect_location(check_text)

    try:
        verdict: AnnotatedVerdict = await execute_tool(
            decision.tool_name,
            check_text,
            url=check_url,
            email=check_email,
            location=check_location,
        )
    except Exception as exc:
        logger.exception("Tool execution failed: %s", exc)
        return ChatMessageResponse(
            type="error",
            session_id=session_id,
            assistant_text="I couldn't complete the check right now. Please try again.",
        )

    intro = decision.assistant_text.strip() or "Here's what I found from live sources:"
    return ChatMessageResponse(
        type="verdict",
        session_id=session_id,
        tool_used=decision.tool_name,
        assistant_text=intro,
        verdict=verdict,
    )
