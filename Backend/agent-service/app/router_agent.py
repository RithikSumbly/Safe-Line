from __future__ import annotations

import re

from app.core.llm_client import get_llm_client
from app.core.schemas import RouterIntent, RouterResult

COMMAND_MAP: dict[str, RouterIntent] = {
    "SCAM": "scam",
    "JOB": "job_offer",
    "CRISIS": "crisis_rumor",
    "RENTAL": "rental_redflag",
}

KEYWORD_HINTS: list[tuple[RouterIntent, re.Pattern[str]]] = [
    ("scam", re.compile(r"(?i)\b(phish|otp|kyc|bank alert|click here|upi scam)\b")),
    ("job_offer", re.compile(r"(?i)\b(job offer|registration fee|hiring|salary|interview)\b")),
    ("crisis_rumor", re.compile(r"(?i)\b(flood|earthquake|evacuate|forward|urgent|dam|riot)\b")),
    ("rental_redflag", re.compile(r"(?i)\b(rent|lease|tenant|landlord|deposit|agreement)\b")),
]


async def classify_intent(text: str) -> RouterResult:
    stripped = text.strip()
    upper = stripped.upper()
    for cmd, intent in COMMAND_MAP.items():
        if upper.startswith(cmd):
            return RouterResult(intent=intent, confidence=0.95)

    for intent, pattern in KEYWORD_HINTS:
        if pattern.search(stripped):
            return RouterResult(intent=intent, confidence=0.75)

    try:
        llm = get_llm_client()
        result = await llm.structured_json(
            system=(
                "Classify user message into scam, job_offer, crisis_rumor, "
                "rental_redflag, or general_help. Return confidence 0-1. "
                "If confidence < 0.6, set clarifying_question asking what they want checked."
            ),
            user=stripped[:4000],
            schema=RouterResult,
        )
        if result.confidence < 0.6 and not result.clarifying_question:
            result.clarifying_question = (
                "What would you like to check? Reply SCAM, JOB, CRISIS, or RENTAL, "
                "or forward the suspicious message."
            )
        return result
    except Exception:
        return RouterResult(
            intent="general_help",
            confidence=0.3,
            clarifying_question=(
                "Forward a suspicious message or reply SCAM, JOB, CRISIS, or RENTAL."
            ),
        )
