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


def _heuristic_spans(
    input_text: str,
    red_flags: list[str],
    status: VerdictStatus,
) -> list[FlaggedSpan]:
    """Fallback when LLM span annotation is unavailable — only exact phrase matches."""
    severity = _severity_for_status(status)
    spans: list[FlaggedSpan] = []
    lowered = input_text.lower()
    tag = 1

    for flag in red_flags[:6]:
        # Try progressively shorter word sequences from the red-flag description
        words = re.findall(r"[A-Za-z0-9']+", flag)
        matched = False
        for length in range(min(6, len(words)), 1, -1):
            for start in range(len(words) - length + 1):
                phrase = " ".join(words[start : start + length])
                if len(phrase) < 8:
                    continue
                idx = lowered.find(phrase.lower())
                if idx >= 0:
                    spans.append(
                        FlaggedSpan(
                            start=idx,
                            end=idx + len(phrase),
                            tag=tag,
                            severity=severity,
                        )
                    )
                    tag += 1
                    matched = True
                    break
            if matched:
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
                f"Red flags:\n" + "\n".join(f"- {r}" for r in red_flags)
            ),
            schema=SpanAnnotationResult,
        )
        valid = [
            s
            for s in result.flagged_spans
            if 0 <= s.start < s.end <= len(input_text)
        ]
        if valid:
            return valid
    except Exception:
        pass
    return _heuristic_spans(input_text, red_flags, status)
