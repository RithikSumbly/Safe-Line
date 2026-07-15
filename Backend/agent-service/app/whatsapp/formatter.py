from __future__ import annotations

from app.core.schemas import AgentVerdict, ChatMessageResponse, VerdictStatus

STATUS_EMOJI = {
    "high_risk": "🟥",
    "medium_risk": "🟨",
    "low_risk": "🟨",
    "likely_safe": "🟩",
    "confirmed": "🟩",
    "likely_false": "🟥",
    "unverified": "🟨",
    "outdated": "🟨",
}

# Meta Cloud API text messages allow up to 4096 characters.
_WHATSAPP_TEXT_LIMIT = 4000

_SKIP_INTROS = frozenset(
    {
        "running a live check on that message now.",
        "here's what i found from live sources:",
        "running a live check on that message now",
        "here's what i found from live sources",
    }
)


def _stamp_label(status: VerdictStatus) -> str:
    labels = {
        "high_risk": "HIGH RISK",
        "medium_risk": "MEDIUM RISK",
        "low_risk": "LOW RISK",
        "likely_safe": "VERIFIED SAFE",
        "confirmed": "VERIFIED SAFE",
        "likely_false": "LIKELY FALSE",
        "unverified": "UNVERIFIED",
        "outdated": "OUTDATED",
    }
    return labels.get(status, status.upper())


def _fit_whatsapp(text: str, limit: int = _WHATSAPP_TEXT_LIMIT) -> str:
    """Clamp to Meta's text limit without mid-line chops when possible."""
    if len(text) <= limit:
        return text
    cut = text[: limit - 1]
    nl = cut.rfind("\n")
    if nl > limit // 2:
        cut = cut[:nl]
    return cut.rstrip() + "…"


def format_verdict_message(verdict: AgentVerdict, *, onboarding: bool = False) -> str:
    parts: list[str] = []
    if onboarding:
        parts.append(
            "Welcome to SafeLine. Forward suspicious messages or reply SCAM, JOB, or CRISIS."
        )
    emoji = STATUS_EMOJI.get(verdict.status, "🟨")
    parts.append(f"{emoji} SafeLine verdict: {_stamp_label(verdict.status)}")
    if verdict.needs_human_review:
        parts.append("⚠️ Needs human review — evidence is thin or conflicting.")
    parts.append(verdict.recommended_action)
    if verdict.agent in ("scam", "crisis_rumor", "job_offer") and verdict.family_friendly_rewrite:
        rewrite = verdict.family_friendly_rewrite.strip()
        if rewrite:
            parts.append(f"\nShare with family:\n{rewrite}")
    if verdict.red_flags:
        parts.append("\nRed flags:")
        for flag in verdict.red_flags[:5]:
            parts.append(f"• {flag}")
    if verdict.evidence:
        parts.append("\nSources checked:")
        for i, ev in enumerate(verdict.evidence[:5], 1):
            snippet = (ev.snippet or "").strip().replace("\n", " ")
            if len(snippet) > 160:
                snippet = snippet[:157] + "…"
            parts.append(f"{i}. {ev.source_name}: {snippet}")
    return "\n".join(parts)


def format_chat_response_for_whatsapp(response: ChatMessageResponse) -> str:
    """Combine orchestrator intro text with a condensed verdict block for WhatsApp."""
    parts: list[str] = []
    intro = (response.assistant_text or "").strip()
    # After a completed check, the default "Running a live check…" line just burns character budget.
    if response.verdict and intro.lower().rstrip(".") in {
        s.rstrip(".") for s in _SKIP_INTROS
    }:
        intro = ""
    if intro:
        parts.append(intro)
    if response.verdict:
        parts.append(format_verdict_message(response.verdict))
    body = "\n\n".join(parts).strip()
    return _fit_whatsapp(body)
