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
    """Fallback when LLM span annotation is unavailable."""
    severity = _severity_for_status(status)
    spans: list[FlaggedSpan] = []
    tag = 1
    lowered = input_text.lower()
    for flag in red_flags[:6]:
        words = [w for w in re.findall(r"[A-Za-z0-9]{4,}", flag) if len(w) >= 4]
        for word in words[:3]:
            idx = lowered.find(word.lower())
            if idx >= 0:
                spans.append(
                    FlaggedSpan(
                        start=idx,
                        end=idx + len(word),
                        tag=tag,
                        severity=severity,
                    )
                )
                tag += 1
                break
    if not spans and input_text.strip():
        end = min(len(input_text), 80)
        spans.append(FlaggedSpan(start=0, end=end, tag=1, severity=severity))
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
                "Map red flags to exact character offsets in the input text. "
                "Return flagged_spans with start, end (exclusive), tag (1-based), "
                "and severity (risk|verified|pending)."
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
