from __future__ import annotations

from pydantic import BaseModel, Field

from app.core.evidence_engine import apply_evidence_floor, risk_score_from_status
from app.core.guardrails import apply_guardrails, strip_pii
from app.core.input_sufficiency import has_prompt_injection, is_insufficient_for_check
from app.core.schemas import AgentType, AgentVerdict, AnnotatedVerdict, EvidenceItem, VerdictStatus
from app.core.span_annotator import annotate_spans

_INSUFFICIENT_ACTIONS: dict[AgentType, str] = {
    "scam": (
        "Paste or forward the full suspicious message — including any links, phone numbers, "
        "sender name, and the exact wording. A short note like 'call me' or 'is this a scam?' "
        "isn't enough to verify."
    ),
    "job_offer": (
        "Share the complete job offer message, recruiter email or domain, and any fee or "
        "payment request. A brief question alone isn't enough to verify."
    ),
    "crisis_rumor": (
        "Forward the full rumor message and, if relevant, your location. A vague question "
        "without the claim text isn't enough to verify."
    ),
}


class VerdictDraft(BaseModel):
    status: VerdictStatus
    confidence: float = Field(ge=0.0, le=1.0)
    red_flags: list[str]
    evidence: list[EvidenceItem]
    explanation: str
    recommended_action: str
    needs_human_review: bool = False
    family_friendly_rewrite: str = ""


def insufficient_input_draft(agent: AgentType, text: str) -> VerdictDraft:
    flags = [
        "Not enough message content to assess — only a brief note or question, no suspicious details"
    ]
    if has_prompt_injection(text):
        flags.insert(
            0,
            "Message contains instructions attempting to override analysis — ignored for safety",
        )

    return VerdictDraft(
        status="unverified",
        confidence=0.35,
        red_flags=flags,
        evidence=[],
        explanation=(
            "There isn't enough detail in this message to run a reliable check. "
            "We need the actual forwarded text, link, or sender details you're worried about."
        ),
        recommended_action=_INSUFFICIENT_ACTIONS[agent],
        needs_human_review=False,
        family_friendly_rewrite="",
    )


def enforce_uncertainty_bounds(
    draft: VerdictDraft,
    agent: AgentType,
    text: str,
) -> VerdictDraft:
    if not is_insufficient_for_check(text):
        return draft
    baseline = insufficient_input_draft(agent, text)
    draft.status = "unverified"
    draft.confidence = min(draft.confidence, 0.55)
    draft.red_flags = baseline.red_flags
    draft.explanation = baseline.explanation
    draft.recommended_action = baseline.recommended_action
    draft.evidence = []
    draft.needs_human_review = False
    draft.family_friendly_rewrite = ""
    return draft


async def finalize_verdict(
    agent: AgentType,
    input_text: str,
    draft: VerdictDraft,
) -> AnnotatedVerdict:
    clean_input = strip_pii(input_text)
    verdict = AgentVerdict(
        agent=agent,
        status=draft.status,
        confidence=draft.confidence,
        risk_score=risk_score_from_status(draft.status, draft.confidence),
        red_flags=draft.red_flags,
        evidence=draft.evidence,
        explanation=draft.explanation,
        recommended_action=draft.recommended_action,
        needs_human_review=draft.needs_human_review,
        disclaimer="",
        family_friendly_rewrite=draft.family_friendly_rewrite,
    )
    verdict = apply_evidence_floor(verdict)
    verdict = apply_guardrails(verdict)
    spans: list = []
    if not is_insufficient_for_check(clean_input):
        spans = await annotate_spans(clean_input, verdict.red_flags, verdict.status)
    return AnnotatedVerdict(
        **verdict.model_dump(),
        input_text=clean_input,
        flagged_spans=spans,
    )
