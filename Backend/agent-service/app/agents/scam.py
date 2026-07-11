from __future__ import annotations

import asyncio
import logging

from pydantic import BaseModel, Field

from app.agents.base import VerdictDraft, finalize_verdict
from app.agents.scam_heuristics import (
    analyze_message_patterns,
    filter_irrelevant_evidence,
    merge_red_flags,
)
from app.core.llm_client import get_llm_client
from app.core.schemas import AnnotatedVerdict, CheckInput, EvidenceItem
from app.rag.retriever import retrieve_chunks
from app.tools.safe_browsing import check_safe_browsing
from app.tools.url_extract import extract_urls
from app.tools.urlhaus import check_urlhaus
from app.tools.virustotal import check_virustotal
from app.tools.web_search import web_search

logger = logging.getLogger(__name__)


class ScamSignals(BaseModel):
    claimed_sender: str = ""
    urgency_words: list[str] = Field(default_factory=list)
    money_request: bool = False
    link_present: bool = False
    scheme_claimed: str = ""


class ScamSynthesis(BaseModel):
    status: str
    confidence: float
    red_flags: list[str]
    explanation: str
    recommended_action: str
    needs_human_review: bool = False
    family_friendly_rewrite: str = ""


async def _gather_url_evidence(urls: list[str]) -> list[EvidenceItem]:
    evidence: list[EvidenceItem] = []
    url_tasks = []
    for url in urls[:2]:
        url_tasks.extend(
            [
                check_safe_browsing(url),
                check_virustotal(url),
                check_urlhaus(url),
            ]
        )
    if not url_tasks:
        return evidence
    url_results = await asyncio.gather(*url_tasks, return_exceptions=True)
    for r in url_results:
        if isinstance(r, EvidenceItem):
            evidence.append(r)
    return evidence


async def _contextual_web_search(text: str, profile_tags: list[str]) -> list[EvidenceItem]:
    queries: list[str] = []
    lower = text.lower()
    if "unsolicited_prize" in profile_tags or "won" in lower:
        queries.append("India lottery prize scam SMS subscribe youtube FTC")
    if "celebrity_impersonation" in profile_tags or "mrleast" in lower or "mr beast" in lower:
        queries.append("MrBeast giveaway scam fake text message")
    if not queries:
        return []
    items: list[EvidenceItem] = []
    for q in queries[:2]:
        items.extend(await web_search(q))
    return items


def _heuristic_draft(
    text: str,
    evidence: list[EvidenceItem],
    profile,
) -> VerdictDraft:
    neg = sum(1 for e in evidence if not e.supports_claim)
    needs_review = len(evidence) < 2

    return VerdictDraft(
        status=profile.status,  # type: ignore[arg-type]
        confidence=profile.confidence if evidence else max(0.55, profile.confidence - 0.15),
        red_flags=profile.red_flags,
        evidence=evidence,
        explanation=profile.explanation,
        recommended_action=profile.recommended_action,
        needs_human_review=needs_review and neg < 2,
        family_friendly_rewrite=profile.family_friendly_rewrite,
    )


async def run_scam_agent(inp: CheckInput) -> AnnotatedVerdict:
    text = inp.text.strip()
    urls = extract_urls(text, inp.url)
    profile = analyze_message_patterns(text, urls)

    evidence: list[EvidenceItem] = []
    evidence.extend(await _gather_url_evidence(urls))
    evidence.extend(profile.evidence)

    rag_items = await retrieve_chunks(text, "scam_corpus")
    evidence.extend(rag_items)
    evidence = filter_irrelevant_evidence(evidence, text)

    evidence.extend(await _contextual_web_search(text, profile.tags))
    # De-dupe by source_name + snippet prefix
    seen: set[str] = set()
    deduped: list[EvidenceItem] = []
    for e in evidence:
        key = f"{e.source_name}:{e.snippet[:80]}"
        if key not in seen:
            seen.add(key)
            deduped.append(e)
    evidence = deduped

    signals = ScamSignals(link_present=bool(urls))
    try:
        llm = get_llm_client()
        signals = await llm.structured_json(
            system="Extract scam signals from the message as structured JSON.",
            user=text,
            schema=ScamSignals,
        )
    except Exception as exc:
        logger.warning("Scam signal extraction failed: %s", exc)

    if signals.scheme_claimed:
        claim_search = await web_search(
            f"{signals.scheme_claimed} scam OR impersonation official warning"
        )
        evidence.extend(claim_search)

    draft: VerdictDraft | None = None
    try:
        llm = get_llm_client()
        synth = await llm.structured_json(
            system=(
                "You are SafeLine's scam analyst for India. Write a verdict grounded ONLY "
                "in the message text and evidence list — never cite RBI/KYC unless the message "
                "mentions banks, OTP, or KYC.\n\n"
                "red_flags: 2-4 short bullets quoting WHAT IN THE MESSAGE is suspicious "
                "(e.g. 'Says you won 338492 rupees', 'Asks subscribe on youtube.com for payout'). "
                "Not generic analyst labels.\n\n"
                "recommended_action: 2-3 concrete steps specific to THIS scam type "
                "(prize/youtube impersonation/bank phishing), not generic cybercrime boilerplate.\n\n"
                "family_friendly_rewrite: 3-4 sentences explaining the scam to parents/relatives "
                "in plain language — what trick is being used and why it's fake. NOT a copy-paste "
                "alert to forward. Educational tone.\n\n"
                "status: high_risk | medium_risk | low_risk | likely_safe | unverified"
            ),
            user=(
                f"Message:\n{text}\n\n"
                f"Detected patterns: {profile.tags}\n"
                f"Signals: {signals.model_dump()}\n\n"
                f"Evidence:\n"
                + "\n".join(
                    f"- [{e.source_name}] supports={e.supports_claim}: {e.snippet}"
                    for e in evidence
                )
                or "(no external evidence — reason from message content only)"
            ),
            schema=ScamSynthesis,
        )
        draft = VerdictDraft(
            status=synth.status,  # type: ignore[arg-type]
            confidence=synth.confidence,
            red_flags=merge_red_flags(synth.red_flags, profile.red_flags),
            evidence=evidence,
            explanation=synth.explanation or profile.explanation,
            recommended_action=synth.recommended_action or profile.recommended_action,
            needs_human_review=synth.needs_human_review or len(evidence) < 1,
            family_friendly_rewrite=(
                synth.family_friendly_rewrite or profile.family_friendly_rewrite
            ),
        )
    except Exception as exc:
        logger.warning("Scam LLM synthesis failed, using heuristic draft: %s", exc)
        draft = _heuristic_draft(text, evidence, profile)

    if not draft.red_flags:
        draft.red_flags = profile.red_flags
    if not draft.family_friendly_rewrite:
        draft.family_friendly_rewrite = profile.family_friendly_rewrite

    return await finalize_verdict("scam", text, draft)
