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
    if verdict.red_flags:
        parts.append("\nRed flags:")
        for flag in verdict.red_flags[:4]:
            parts.append(f"• {flag}")
    if verdict.evidence:
        parts.append("\nSources checked:")
        for i, ev in enumerate(verdict.evidence[:3], 1):
            parts.append(f"{i}. {ev.source_name}: {ev.snippet[:120]}")
    text = "\n".join(parts)
    if len(text) > 1500:
        return text[:1490] + "…"
    return text


def format_chat_response_for_whatsapp(response: ChatMessageResponse) -> str:
    """Combine orchestrator intro text with a condensed verdict block for WhatsApp."""
    parts: list[str] = []
    intro = (response.assistant_text or "").strip()
    if intro:
        parts.append(intro)
    if response.verdict:
        parts.append(format_verdict_message(response.verdict))
    body = "\n\n".join(parts).strip()
    if len(body) > 4000:
        return body[:3990] + "…"
    return body
