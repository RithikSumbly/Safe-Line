from __future__ import annotations

import re

OFF_SCOPE_REPLY = (
    "I'm only built to check suspicious messages: scam SMS, fake job offers, "
    "and crisis rumors. Paste or forward what you received and I'll run a live check."
)

# Obvious off-topic requests — block before tools or heavy LLM work.
_OFF_TOPIC_PATTERNS: list[re.Pattern[str]] = [
    re.compile(
        r"(?i)\b(write|generate|draft|create)\b.{0,40}\b(essay|code|poem|story|song|script)\b"
    ),
    re.compile(r"(?i)\b(homework|assignment|solve this|math problem|calculate)\b"),
    re.compile(r"(?i)\b(recipe|cooking|restaurant|movie|tv show|game guide)\b"),
    re.compile(r"(?i)\b(weather|stock price|crypto tip|invest in|trading signal)\b"),
    re.compile(r"(?i)\b(medical advice|diagnose|symptoms|prescription|doctor)\b"),
    re.compile(r"(?i)\b(legal advice|lawyer|sue|contract review|court case)\b"),
    re.compile(r"(?i)\b(roleplay|pretend you are|ignore (all )?previous|jailbreak)\b"),
    re.compile(r"(?i)\b(dating advice|relationship advice|horoscope)\b"),
]

_IN_SCOPE_HINTS: list[re.Pattern[str]] = [
    re.compile(
        r"(?i)\b(scam|phish|fake|fraud|otp|kyc|upi|bank|sms|forward|job offer|"
        r"rumou?r|flood|earthquake|evacuat|suspicious|verify|safe|phishing)\b"
    ),
]


def is_off_topic(text: str) -> bool:
    stripped = text.strip()
    if len(stripped) < 12:
        return False

    if any(h.search(stripped) for h in _IN_SCOPE_HINTS):
        return False

    return any(p.search(stripped) for p in _OFF_TOPIC_PATTERNS)
