from __future__ import annotations

import logging
import re

from app.core.llm_client import get_llm_client
from app.core.prompt_guards import analysis_prompt
from app.core.schemas import FlaggedSpan, SpanPhraseResult, SpanSeverity, VerdictStatus

logger = logging.getLogger(__name__)

_SUSPICIOUS = re.compile(
    r"(?i)(https?://|\.com/|\.in/|rs\.?\s*\d|₹\s*\d|\b\d+\s*hours?\b|"
    r"destroy|leaked|forward\s+to\s+all|won|prize|subscribe|kyc|otp|pay\b)"
)


def _severity_for_status(status: VerdictStatus) -> SpanSeverity:
    if status in ("high_risk", "likely_false"):
        return "risk"
    if status in ("confirmed", "likely_safe"):
        return "verified"
    return "pending"


def _locate_phrase(input_text: str, phrase: str) -> tuple[int, int] | None:
    phrase = phrase.strip()
    if len(phrase) < 4:
        return None
    exact = input_text.find(phrase)
    if exact >= 0:
        return exact, exact + len(phrase)
    lower_text = input_text.lower()
    lower_phrase = phrase.lower()
    idx = lower_text.find(lower_phrase)
    if idx >= 0:
        return idx, idx + len(phrase)
    return None


def _phrase_quality(input_text: str, phrase: str) -> bool:
    if len(phrase.strip()) < 6:
        return False
    # Reject generic openers the model often over-highlights.
    generic = {
        "your parcel",
        "your account",
        "dear customer",
        "dear user",
        "customs",
        "student",
        "students",
    }
    if phrase.strip().lower() in generic:
        return False
    if _SUSPICIOUS.search(phrase):
        return True
    # Allow longer phrases even without keyword hits.
    return len(phrase.strip()) >= 20


def _phrases_to_spans(
    input_text: str,
    phrases: list[str],
    tags: list[int],
    severities: list[SpanSeverity],
    default_severity: SpanSeverity,
) -> list[FlaggedSpan]:
    spans: list[FlaggedSpan] = []
    used_ranges: list[tuple[int, int]] = []

    for i, phrase in enumerate(phrases):
        if i >= len(tags):
            break
        if not _phrase_quality(input_text, phrase):
            continue
        located = _locate_phrase(input_text, phrase)
        if not located:
            continue
        start, end = located
        if any(not (end <= s or start >= e) for s, e in used_ranges):
            continue
        severity = severities[i] if i < len(severities) else default_severity
        spans.append(
            FlaggedSpan(start=start, end=end, tag=tags[i], severity=severity)
        )
        used_ranges.append((start, end))

    return sorted(spans, key=lambda s: s.start)


def _dedupe_spans(spans: list[FlaggedSpan]) -> list[FlaggedSpan]:
    ordered = sorted(spans, key=lambda s: (-(s.end - s.start), s.start))
    kept: list[FlaggedSpan] = []
    for span in ordered:
        if any(
            not (span.end <= other.start or span.start >= other.end)
            for other in kept
        ):
            continue
        kept.append(span)
    return sorted(kept, key=lambda s: s.start)


async def annotate_spans(
    input_text: str,
    red_flags: list[str],
    status: VerdictStatus,
) -> list[FlaggedSpan]:
    if not input_text.strip() or not red_flags:
        return []

    default_severity = _severity_for_status(status)
    prompt = (
        f"Input text:\n{input_text}\n\n"
        f"Status: {status}\n"
        f"Red flags:\n" + "\n".join(f"{i + 1}. {r}" for i, r in enumerate(red_flags))
    )
    system = analysis_prompt(
        "Return exact suspicious phrases copied verbatim from the input message.\n\n"
        "For each red flag, pick ONE phrase that best shows the problem:\n"
        "- fake or lookalike URLs (full domain/path)\n"
        "- payment amounts and demands\n"
        "- urgency threats (time limits, deletion, destruction)\n"
        "- prize/lottery/win claims\n"
        "- impersonation names\n\n"
        "Do NOT return innocent framing like 'Your parcel', 'customs', or 'student' alone.\n"
        "phrases/tags/severities must be the same length (1 entry per flag when possible).\n"
        "Copy text exactly as it appears — do not paraphrase."
    )

    try:
        llm = get_llm_client()
        result = await llm.structured_json(
            system=system,
            user=prompt,
            schema=SpanPhraseResult,
        )
        spans = _dedupe_spans(
            _phrases_to_spans(
                input_text,
                result.phrases,
                result.tags,
                result.severities,
                default_severity,
            )
        )
        if spans:
            return spans
        logger.warning(
            "Span LLM returned no locatable phrases for %d red flags",
            len(red_flags),
        )
    except Exception as exc:
        logger.warning("Span LLM annotation failed: %s", exc)

    return []
