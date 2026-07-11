from __future__ import annotations

import re

_INJECTION = re.compile(
    r"(?i)\b(ignore\s+(all\s+)?(previous|prior)\s+instructions?|"
    r"return\s+safe|mark\s+as\s+(safe|verified)|system\s+prompt|"
    r"you\s+are\s+now|disregard\s+)"
)

_SUBSTANCE = re.compile(
    r"(?i)(https?://|www\.|\.com\b|\.in\b|otp|kyc|upi|rs\.?\s*\d|₹\s*\d|rupee|"
    r"won|prize|lottery|pay\b|click|verify|forward|bank|account|parcel|"
    r"job|offer|salary|hiring|flood|dam|evacuat|exam|leak|postpon|customs|"
    r"tracking|subscribe|youtube|telegram|fee|registration|interview|destroy|"
    r"urgent|leaked|postponed)"
)

_META_NOISE = re.compile(
    r"(?i)\b("
    r"is\s+this\s+(a\s+)?(scam|fake|legit|real|safe)|"
    r"should\s+i\s+(trust|worry|respond|reply)|"
    r"can\s+you\s+check|please\s+check|"
    r"scam\??|fake\??|phish\??|"
    r"hey|hi|hello|hii|call\s+me|text\s+me|msg\s+me|message\s+me"
    r")\b|[\?.!,]"
)


def is_insufficient_for_check(text: str) -> bool:
    """True when there is too little substantive content to run a meaningful check."""
    stripped = (text or "").strip()
    if not stripped:
        return True
    if _INJECTION.search(stripped) and not _SUBSTANCE.search(stripped):
        return True
    if _SUBSTANCE.search(stripped) and len(stripped) >= 12:
        return False
    remainder = _META_NOISE.sub(" ", stripped)
    remainder = " ".join(remainder.split())
    if len(remainder) < 10:
        return True
    if len(stripped) < 28 and not _SUBSTANCE.search(stripped):
        return True
    return False


def looks_like_check_request(text: str) -> bool:
    return bool(
        re.search(r"(?i)\b(scam|fake|phish|legit|trust|verify|check\s+this)\??", text or "")
    )


def has_prompt_injection(text: str) -> bool:
    return bool(_INJECTION.search(text or ""))
