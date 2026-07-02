from __future__ import annotations

import re
from typing import Literal, Optional

from pydantic import BaseModel, Field

from app.core.llm_client import get_llm_client
from app.core.schemas import AgentType
from app.router_agent import KEYWORD_HINTS

MessageMode = Literal["chitchat", "command", "content_check"]


class MessageClassification(BaseModel):
    mode: MessageMode
    agent_guess: Optional[AgentType] = None
    confidence: float = Field(ge=0.0, le=1.0)


class ParsedCommand(BaseModel):
    command: Literal[
        "SCAM",
        "JOB",
        "CRISIS",
        "RENTAL",
        "HELP",
        "MENU",
        "CHECK",
        "DONE",
        "GO",
    ]
    agent: Optional[AgentType] = None


COMMAND_AGENT: dict[str, AgentType] = {
    "SCAM": "scam",
    "JOB": "job_offer",
    "CRISIS": "crisis_rumor",
    "RENTAL": "rental_redflag",
}

_CMD_RE = re.compile(r"(?i)^\s*(scam|job|crisis|rental|help|menu|check|done|go)\b")


def parse_command(text: str) -> Optional[ParsedCommand]:
    m = _CMD_RE.search(text or "")
    if not m:
        return None
    cmd = m.group(1).upper()
    return ParsedCommand(command=cmd, agent=COMMAND_AGENT.get(cmd))


def is_chitchat(text: str) -> bool:
    t = (text or "").strip().lower()
    if not t:
        return True
    if len(t) <= 3 and t in {"hi", "hey", "yo"}:
        return True
    if t in {"hello", "hii", "hiiii", "hai"}:
        return True
    if "what can you do" in t or "how does this work" in t or "help" == t:
        return True
    return False


async def classify_message(text: str) -> MessageClassification:
    """
    One-shot classifier for WhatsApp inbound content (post vision-extraction if needed).
    Commands should be handled by parse_command() before calling this.
    """
    stripped = (text or "").strip()
    if is_chitchat(stripped):
        return MessageClassification(mode="chitchat", confidence=0.95)

    # Cheap keyword heuristic path (keeps things robust even if LLM fails).
    for intent, pattern in KEYWORD_HINTS:
        if intent == "general_help":
            continue
        if pattern.search(stripped):
            return MessageClassification(
                mode="content_check", agent_guess=intent, confidence=0.75
            )

    try:
        llm = get_llm_client()
        result = await llm.structured_json(
            system=(
                "You are a WhatsApp message router for SafeLine.\n"
                "Return strict JSON with:\n"
                '- mode: \"chitchat\" | \"command\" | \"content_check\"\n'
                '- agent_guess: \"scam\" | \"job_offer\" | \"crisis_rumor\" | \"rental_redflag\" | null\n'
                "- confidence: number 0..1\n\n"
                "Rules:\n"
                "- If user is greeting or asking capabilities -> chitchat.\n"
                "- If user explicitly typed one of: SCAM/JOB/CRISIS/RENTAL/HELP/MENU/CHECK/DONE/GO -> command.\n"
                "- Otherwise -> content_check, and choose best agent_guess if clear.\n"
            ),
            user=stripped[:4000],
            schema=MessageClassification,
        )
        return result
    except Exception:
        return MessageClassification(mode="content_check", agent_guess=None, confidence=0.4)
