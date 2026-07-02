from __future__ import annotations

import asyncio

from pydantic import BaseModel, Field

from app.agents.base import VerdictDraft, finalize_verdict
from app.core.llm_client import get_llm_client
from app.core.schemas import AnnotatedVerdict, CheckInput, EvidenceItem
from app.rag.retriever import retrieve_chunks
from app.tools.safe_browsing import check_safe_browsing
from app.tools.url_extract import extract_urls
from app.tools.urlhaus import check_urlhaus
from app.tools.virustotal import check_virustotal
from app.tools.web_search import web_search


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


async def run_scam_agent(inp: CheckInput) -> AnnotatedVerdict:
    text = inp.text.strip()
    urls = extract_urls(text, inp.url)
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
    url_results = await asyncio.gather(*url_tasks, return_exceptions=True)
    for r in url_results:
        if isinstance(r, EvidenceItem):
            evidence.append(r)

    rag_items = await retrieve_chunks(text, "scam_corpus")
    evidence.extend(rag_items)

    signals = ScamSignals()
    try:
        llm = get_llm_client()
        signals = await llm.structured_json(
            system="Extract scam signals from the message as structured JSON.",
            user=text,
            schema=ScamSignals,
        )
    except Exception:
        pass

    if signals.scheme_claimed:
        claim_search = await web_search(
            f"{signals.scheme_claimed} official verification site:gov.in OR site:rbi.org.in"
        )
        evidence.extend(claim_search)

    neg = sum(1 for e in evidence if not e.supports_claim)
    pos = sum(1 for e in evidence if e.supports_claim)
    status = "high_risk" if neg >= 2 or signals.money_request else "medium_risk" if neg >= 1 else "low_risk"

    try:
        llm = get_llm_client()
        synth = await llm.structured_json(
            system=(
                "Synthesize a scam verdict from evidence. status must be one of: "
                "high_risk, medium_risk, low_risk, likely_safe, unverified."
            ),
            user=(
                f"Message:\n{text}\n\nSignals: {signals.model_dump()}\n\n"
                f"Evidence:\n"
                + "\n".join(f"- {e.source_name}: {e.snippet}" for e in evidence)
            ),
            schema=ScamSynthesis,
        )
        draft = VerdictDraft(
            status=synth.status,  # type: ignore[arg-type]
            confidence=synth.confidence,
            red_flags=synth.red_flags or ["Suspicious messaging pattern detected"],
            evidence=evidence,
            explanation=synth.explanation,
            recommended_action=synth.recommended_action,
            needs_human_review=synth.needs_human_review,
        )
    except Exception:
        draft = VerdictDraft(
            status=status,  # type: ignore[arg-type]
            confidence=0.7 if neg else 0.5,
            red_flags=[
                "Third-party link not on official domain" if urls else "Urgency or impersonation language",
                "Pattern matches known phishing advisories" if rag_items else "Limited corroborating sources",
            ],
            evidence=evidence,
            explanation=(
                "This message shows patterns commonly reported in phishing and impersonation scams."
            ),
            recommended_action=(
                "Do not click any links. Delete the message and report at cybercrime.gov.in or call 1930."
            ),
            needs_human_review=not evidence,
        )

    return await finalize_verdict("scam", text, draft)
