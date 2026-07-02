from __future__ import annotations

import re

from pydantic import BaseModel, Field

from app.agents.base import VerdictDraft, finalize_verdict
from app.core.llm_client import get_llm_client
from app.core.schemas import AnnotatedVerdict, CheckInput, EvidenceItem
from app.rag.retriever import retrieve_chunks
from app.tools.dns_mx import check_mx
from app.tools.url_extract import domain_from_url
from app.tools.web_search import web_search
from app.tools.whois import whois_lookup


class JobSignals(BaseModel):
    company_name: str = ""
    payment_requested: bool = False
    contact_email_domain: str = ""
    urgency: bool = False
    stated_salary: str = ""


class JobSynthesis(BaseModel):
    status: str
    confidence: float
    red_flags: list[str]
    explanation: str
    recommended_action: str
    needs_human_review: bool = False


def _email_domain(email: str | None, text: str) -> str:
    if email and "@" in email:
        return email.split("@", 1)[1].lower()
    m = re.search(r"[\w.-]+@([\w.-]+\.\w+)", text)
    return m.group(1).lower() if m else ""


async def run_job_agent(inp: CheckInput) -> AnnotatedVerdict:
    text = inp.text.strip()
    evidence: list[EvidenceItem] = []

    domain = _email_domain(inp.email, text)
    if domain:
        whois_ev = await whois_lookup(domain)
        if whois_ev:
            evidence.append(whois_ev)
        mx_ev = await check_mx(domain)
        if mx_ev:
            evidence.append(mx_ev)

    rag = await retrieve_chunks(text + " job scam registration fee", "scam_corpus")
    evidence.extend(rag)

    signals = JobSignals()
    try:
        llm = get_llm_client()
        signals = await llm.structured_json(
            system="Extract job offer scam signals.",
            user=text,
            schema=JobSignals,
        )
    except Exception:
        pass

    if not domain and signals.contact_email_domain:
        domain = signals.contact_email_domain

    if signals.company_name:
        company_hits = await web_search(f"{signals.company_name} official careers site")
        if not company_hits:
            evidence.append(
                EvidenceItem(
                    source_name="Web search",
                    source_url=None,
                    supports_claim=False,
                    snippet=f"Limited independent web presence found for employer '{signals.company_name}'.",
                )
            )
        else:
            evidence.extend(company_hits[:1])

    if signals.payment_requested:
        evidence.append(
            EvidenceItem(
                source_name="Ministry of Labour & Employment",
                source_url="https://www.labour.gov.in/",
                supports_claim=False,
                snippet="Legitimate employers do not charge registration fees for job offers.",
            )
        )

    status = "high_risk" if signals.payment_requested else "medium_risk"
    if any(not e.supports_claim for e in evidence):
        status = "high_risk"

    try:
        llm = get_llm_client()
        synth = await llm.structured_json(
            system="Synthesize fake job offer verdict from evidence.",
            user=f"Offer:\n{text}\n\nSignals: {signals}\n\nEvidence:\n" + "\n".join(e.snippet for e in evidence),
            schema=JobSynthesis,
        )
        draft = VerdictDraft(
            status=synth.status,  # type: ignore[arg-type]
            confidence=synth.confidence,
            red_flags=synth.red_flags,
            evidence=evidence,
            explanation=synth.explanation,
            recommended_action=synth.recommended_action,
            needs_human_review=synth.needs_human_review,
        )
    except Exception:
        draft = VerdictDraft(
            status=status,  # type: ignore[arg-type]
            confidence=0.85 if signals.payment_requested else 0.6,
            red_flags=[
                "Upfront registration fee before employment" if signals.payment_requested else "Unverified employer contact",
                "Sender uses non-corporate email domain" if domain and "gmail" in domain else "Unsolicited offer pattern",
            ],
            evidence=evidence,
            explanation="This offer matches patterns commonly seen in employment-fee scams.",
            recommended_action="Do not pay any fee. Verify the employer through their official careers website.",
            needs_human_review=not evidence,
        )

    return await finalize_verdict("job_offer", text, draft)
