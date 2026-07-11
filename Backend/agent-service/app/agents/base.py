from __future__ import annotations

from pydantic import BaseModel, Field

from app.core.evidence_engine import apply_evidence_floor, risk_score_from_status
from app.core.guardrails import apply_guardrails, strip_pii
from app.core.schemas import AgentType, AgentVerdict, AnnotatedVerdict, EvidenceItem, VerdictStatus
from app.core.span_annotator import annotate_spans


class VerdictDraft(BaseModel):
    status: VerdictStatus
    confidence: float = Field(ge=0.0, le=1.0)
    red_flags: list[str]
    evidence: list[EvidenceItem]
    explanation: str
    recommended_action: str
    needs_human_review: bool = False
    family_friendly_rewrite: str = ""


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
    spans = await annotate_spans(clean_input, verdict.red_flags, verdict.status)
    return AnnotatedVerdict(
        **verdict.model_dump(),
        input_text=clean_input,
        flagged_spans=spans,
    )
