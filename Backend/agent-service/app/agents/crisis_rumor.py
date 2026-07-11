from __future__ import annotations

import asyncio
import logging

from pydantic import BaseModel, Field

from app.agents.base import (
    VerdictDraft,
    enforce_uncertainty_bounds,
    finalize_verdict,
    insufficient_input_draft,
)
from app.agents.crisis_heuristics import analyze_crisis_patterns, merge_crisis_red_flags
from app.core.input_sufficiency import is_insufficient_for_check
from app.core.llm_client import get_llm_client
from app.core.prompt_guards import extraction_prompt, synthesis_prompt
from app.core.status_coercion import coerce_verdict_status
from app.core.schemas import AnnotatedVerdict, CheckInput, EvidenceItem
from app.tools.fact_check import check_fact_check
from app.tools.gdelt import search_gdelt
from app.tools.gov_search import search_government
from app.tools.news_api import search_news
from app.tools.nominatim import geocode, location_mismatch_evidence


logger = logging.getLogger(__name__)


class CrisisClaim(BaseModel):
    event_type: str = ""
    claimed_location: str = ""
    claimed_date_time: str = ""
    urgency_high: bool = False
    claimed_source: str = ""


class CrisisSynthesis(BaseModel):
    status: str
    confidence: float
    red_flags: list[str]
    explanation: str
    recommended_action: str
    needs_human_review: bool = False
    family_friendly_rewrite: str = ""


def _status_from_evidence(evidence: list[EvidenceItem]) -> str:
    false_hits = sum(1 for e in evidence if not e.supports_claim)
    confirm_hits = sum(1 for e in evidence if e.supports_claim)
    if false_hits >= 2:
        return "likely_false"
    if confirm_hits >= 2 and false_hits == 0:
        return "confirmed"
    if any(
        "mislocalized" in e.snippet.lower() or "different area" in e.snippet.lower()
        for e in evidence
    ):
        return "outdated"
    return "unverified"


async def run_crisis_agent(inp: CheckInput) -> AnnotatedVerdict:
    text = inp.text.strip()
    if is_insufficient_for_check(text):
        return await finalize_verdict(
            "crisis_rumor", text, insufficient_input_draft("crisis_rumor", text)
        )

    profile = analyze_crisis_patterns(text)
    evidence: list[EvidenceItem] = []

    claim = CrisisClaim()
    try:
        llm = get_llm_client()
        claim = await llm.structured_json(
            system=extraction_prompt(
                "Extract structured crisis rumor claim fields from the message."
            ),
            user=text,
            schema=CrisisClaim,
        )
    except Exception as exc:
        logger.warning("Crisis claim extraction failed: %s", exc)

    user_geo = await geocode(inp.location or "")
    if user_geo:
        mismatch = await location_mismatch_evidence(user_geo, claim.claimed_location)
        if mismatch:
            evidence.append(mismatch)

    query = f"{claim.event_type} {claim.claimed_location}".strip() or text[:200]
    fc, news, gdelt, gov = await asyncio.gather(
        check_fact_check(query),
        search_news(query, claim.claimed_location),
        search_gdelt(query),
        search_government(query),
        return_exceptions=True,
    )
    for batch in (fc, news, gdelt, gov):
        if isinstance(batch, list):
            evidence.extend(batch)

    status = _status_from_evidence(evidence) if evidence else profile.status

    draft: VerdictDraft | None = None
    try:
        llm = get_llm_client()
        synth = await llm.structured_json(
            system=synthesis_prompt(
                "You are SafeLine's crisis rumor analyst for India.",
                "Write a verdict grounded in the claim text and evidence (evidence may be empty).\n\n"
                "red_flags: 2-4 bullets about what is suspicious IN THIS specific forward "
                "(e.g. 'Says CBSE paper leaked but cites no official notice', "
                "'Asks to forward before deletion'). Not generic disaster boilerplate.\n\n"
                "recommended_action: 2-4 imperative steps specific to THIS rumor type "
                "(exam leak → check cbse.gov.in; flood → district/NDMA; health → MoHFW). "
                "Only mention 112 if the claim involves immediate physical danger "
                "(flood, fire, collapse, evacuation). Never mention 112 for exam or job rumors.\n\n"
                "family_friendly_rewrite: 2-3 plain sentences for relatives explaining "
                "what the forward claims and why it's unverified — educational, not an alert template.\n\n"
                "status: confirmed | likely_false | outdated | unverified",
            ),
            user=(
                f"Claim:\n{text}\n\n"
                f"Detected patterns: {profile.tags}\n"
                f"Extracted fields: {claim.model_dump()}\n\n"
                f"Evidence:\n"
                + "\n".join(
                    f"- [{e.source_name}] supports={e.supports_claim}: {e.snippet}"
                    for e in evidence
                )
                or "(no external evidence — reason from claim content only)"
            ),
            schema=CrisisSynthesis,
        )
        draft = VerdictDraft(
            status=coerce_verdict_status(synth.status, "crisis_rumor"),
            confidence=synth.confidence if evidence else min(synth.confidence, 0.4),
            red_flags=merge_crisis_red_flags(synth.red_flags, profile.red_flags),
            evidence=evidence,
            explanation=synth.explanation or profile.explanation,
            recommended_action=synth.recommended_action or profile.recommended_action,
            needs_human_review=synth.needs_human_review or not evidence,
            family_friendly_rewrite=(
                synth.family_friendly_rewrite or profile.family_friendly_rewrite
            ),
        )
    except Exception as exc:
        logger.warning("Crisis LLM synthesis failed, using heuristic draft: %s", exc)
        draft = None

    if draft is None:
        if not evidence:
            draft = VerdictDraft(
                status=profile.status,  # type: ignore[arg-type]
                confidence=profile.confidence,
                red_flags=profile.red_flags
                or ["No matching fact-checks or official bulletins found"],
                evidence=[],
                explanation=profile.explanation,
                recommended_action=profile.recommended_action,
                needs_human_review=True,
                family_friendly_rewrite=profile.family_friendly_rewrite,
            )
        else:
            draft = VerdictDraft(
                status=status,  # type: ignore[arg-type]
                confidence=0.55,
                red_flags=merge_crisis_red_flags(
                    ["Conflicting or thin corroboration across sources"],
                    profile.red_flags,
                ),
                evidence=evidence,
                explanation=(
                    profile.explanation
                    or "Cross-source review produced mixed or limited corroboration for this claim."
                ),
                recommended_action=profile.recommended_action
                or (
                    "Verify with the relevant official organisation before forwarding "
                    "or acting on this claim."
                ),
                needs_human_review=status == "unverified",
                family_friendly_rewrite=profile.family_friendly_rewrite,
            )

    draft = enforce_uncertainty_bounds(draft, "crisis_rumor", text)

    if not draft.red_flags:
        draft.red_flags = profile.red_flags or [
            "No matching fact-checks or official bulletins found"
        ]
    if not draft.family_friendly_rewrite:
        draft.family_friendly_rewrite = profile.family_friendly_rewrite

    return await finalize_verdict("crisis_rumor", text, draft)
