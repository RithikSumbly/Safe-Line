from __future__ import annotations

import re

from app.core.llm_client import get_llm_client
from app.core.schemas import FlaggedSpan, SpanAnnotationResult, SpanSeverity, VerdictStatus


def _severity_for_status(status: VerdictStatus) -> SpanSeverity:
    if status in ("high_risk", "likely_false"):
        return "risk"
    if status in ("confirmed", "likely_safe"):
        return "verified"
    return "pending"


# Map red-flag index (1-based tag) to regexes that must match text literally
_MESSAGE_INDICATORS: list[tuple[re.Pattern[str], int | None]] = [
    (re.compile(r"(?i)\b(won|winner|congratulations|congrats|prize|lottery)\b"), 1),
    (re.compile(r"(?i)\b\d[\d,]*\s*(rupees?|rs\.?)\b"), 1),
    (re.compile(r"(?i)youtube\.com[^\s]*"), 2),
    (re.compile(r"(?i)\byoutu\.be[^\s]*"), 2),
    (re.compile(r"(?i)\bsubscribe\b"), 2),
    (re.compile(r"(?i)\b(mr\.?\s*beast|mrleast)\b"), 2),
    (re.compile(r"(?i)\b(kyc|otp|upi|account\s*frozen)\b"), 3),
    (re.compile(r"https?://[^\s]+", re.I), None),
]


def _heuristic_spans(
    input_text: str,
    red_flags: list[str],
    status: VerdictStatus,
) -> list[FlaggedSpan]:
    """Highlight phrases that literally appear in the message."""
    severity = _severity_for_status(status)
    spans: list[FlaggedSpan] = []
    used_ranges: list[tuple[int, int]] = []

    def add_span(start: int, end: int, tag: int) -> None:
        if any(not (end <= s or start >= e) for s, e in used_ranges):
            return
        spans.append(
            FlaggedSpan(start=start, end=end, tag=tag, severity=severity)
        )
        used_ranges.append((start, end))

    tag_for_generic = 1
    for pattern, fixed_tag in _MESSAGE_INDICATORS:
        tag = fixed_tag or min(tag_for_generic, max(len(red_flags), 1))
        for m in pattern.finditer(input_text):
            add_span(m.start(), m.end(), tag)
        if fixed_tag is None and pattern.search(input_text):
            tag_for_generic += 1

    # Fallback: if nothing matched, tie tags to red_flag order using short literals from flags
    if not spans:
        for i, flag in enumerate(red_flags[:4], start=1):
            for token in re.findall(r"[A-Za-z0-9.]{4,}", flag):
                if len(token) < 4:
                    continue
                idx = input_text.lower().find(token.lower())
                if idx >= 0:
                    add_span(idx, idx + len(token), i)
                    break

    return spans


async def annotate_spans(
    input_text: str,
    red_flags: list[str],
    status: VerdictStatus,
) -> list[FlaggedSpan]:
    try:
        llm = get_llm_client()
        result = await llm.structured_json(
            system=(
                "Map each red flag to an exact verbatim substring in the input message. "
                "Rules: (1) start/end must be character offsets into the original input only; "
                "(2) tag is 1-based and matches the red-flag order; "
                "(3) severity is risk|verified|pending; "
                "(4) only highlight phrases that literally appear in the message — "
                "never highlight analyst commentary or words not in the original text; "
                "(5) omit a span if no exact phrase matches rather than guessing."
            ),
            user=(
                f"Input text:\n{input_text}\n\n"
                f"Status: {status}\n"
                f"Red flags:\n" + "\n".join(f"{i+1}. {r}" for i, r in enumerate(red_flags))
            ),
            schema=SpanAnnotationResult,
        )
        valid = [
            s
            for s in result.flagged_spans
            if 0 <= s.start < s.end <= len(input_text)
            and input_text[s.start : s.end].strip()
        ]
        if valid:
            return valid
    except Exception:
        pass
    return _heuristic_spans(input_text, red_flags, status)
