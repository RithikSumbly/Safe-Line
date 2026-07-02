from __future__ import annotations

import asyncio

from pydantic import BaseModel, Field

from app.agents.base import VerdictDraft, finalize_verdict
from app.core.llm_client import get_llm_client
from app.core.schemas import AnnotatedVerdict, CheckInput, EvidenceItem
from app.tools.fact_check import check_fact_check
from app.tools.gdelt import search_gdelt
from app.tools.gov_search import search_government
from app.tools.news_api import search_news
from app.tools.nominatim import geocode, location_mismatch_evidence


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
    safe_rewrite: str = ""


async def run_crisis_agent(inp: CheckInput) -> AnnotatedVerdict:
    text = inp.text.strip()
    evidence: list[EvidenceItem] = []

    claim = CrisisClaim()
    try:
        llm = get_llm_client()
        claim = await llm.structured_json(
            system="Extract structured crisis rumor claim fields.",
            user=text,
            schema=CrisisClaim,
        )
    except Exception:
        pass

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

    if not evidence:
        draft = VerdictDraft(
            status="unverified",
            confidence=0.25,
            red_flags=["No matching fact-checks or official bulletins found"],
            evidence=[],
            explanation=(
                "We could not find corroborating fact-checks or official advisories for this claim. "
                "Live sources may be unavailable or the claim is too recent to verify."
            ),
            recommended_action=(
                "If you are in immediate danger, call 112. Otherwise verify with local disaster "
                "management authorities before forwarding. Do not panic-share unverified forwards."
            ),
            needs_human_review=True,
        )
        return await finalize_verdict("crisis_rumor", text, draft)

    false_hits = sum(1 for e in evidence if not e.supports_claim)
    confirm_hits = sum(1 for e in evidence if e.supports_claim)
    if false_hits >= 2:
        status = "likely_false"
    elif confirm_hits >= 2 and false_hits == 0:
        status = "confirmed"
    elif mismatch_evidence := any("mislocalized" in e.snippet.lower() or "different area" in e.snippet.lower() for e in evidence):
        status = "outdated" if mismatch_evidence else "unverified"
    else:
        status = "unverified"

    try:
        llm = get_llm_client()
        synth = await llm.structured_json(
            system=(
                "Synthesize crisis rumor verdict. status: confirmed, likely_false, outdated, unverified. "
                "Include a calm safe_rewrite message for group chats in recommended_action."
            ),
            user=(
                f"Claim:\n{text}\n\nExtracted: {claim}\n\nEvidence:\n"
                + "\n".join(f"- {e.source_name}: {e.snippet}" for e in evidence)
            ),
            schema=CrisisSynthesis,
        )
        action = synth.recommended_action
        if synth.safe_rewrite:
            action += f"\n\nSuggested reply to forward: {synth.safe_rewrite}"
        draft = VerdictDraft(
            status=synth.status,  # type: ignore[arg-type]
            confidence=synth.confidence,
            red_flags=synth.red_flags,
            evidence=evidence,
            explanation=synth.explanation,
            recommended_action=action,
            needs_human_review=synth.needs_human_review or status == "unverified",
        )
    except Exception:
        draft = VerdictDraft(
            status=status,  # type: ignore[arg-type]
            confidence=0.55,
            red_flags=["Conflicting or thin corroboration across sources"],
            evidence=evidence,
            explanation="Cross-source review produced mixed or limited corroboration for this claim.",
            recommended_action=(
                "Verify with official sources (PIB, NDMA, state disaster management) before acting or forwarding."
            ),
            needs_human_review=status == "unverified",
        )

    return await finalize_verdict("crisis_rumor", text, draft)
