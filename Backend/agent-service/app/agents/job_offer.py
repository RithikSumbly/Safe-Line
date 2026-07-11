from __future__ import annotations

import asyncio
import re

from pydantic import BaseModel, Field

from app.agents.base import (
    VerdictDraft,
    enforce_uncertainty_bounds,
    finalize_verdict,
    insufficient_input_draft,
)
from app.core.input_sufficiency import is_insufficient_for_check
from app.core.llm_client import get_llm_client
from app.core.prompt_guards import extraction_prompt, synthesis_prompt
from app.core.status_coercion import coerce_verdict_status
from app.core.schemas import AnnotatedVerdict, CheckInput, EvidenceItem
from app.rag.retriever import retrieve_chunks
from app.tools.dns_mx import check_mx
from app.tools.email_domain import check_email_domain, is_free_mail_domain
from app.tools.news_api import search_news
from app.tools.web_search import web_search
from app.tools.whois import whois_lookup

FEE_PATTERN = re.compile(
    r"(?:pay|fee|registration|deposit|charges?)\s*(?:₹|rs\.?|inr)?\s*\d+",
    re.I,
)


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


def _mentions_upfront_fee(text: str) -> bool:
    return bool(FEE_PATTERN.search(text))


async def _live_job_evidence(
    text: str,
    domain: str,
    company: str,
) -> list[EvidenceItem]:
    """Gather live external sources — no hardcoded RBI banking fallback."""
    tasks: list = []

    if domain:
        if not is_free_mail_domain(domain):
            tasks.extend([whois_lookup(domain), check_mx(domain)])
        else:
            tasks.append(check_mx(domain))

    news_query = "fake job offer registration fee scam India"
    if company:
        news_query = f"{company} fake job offer registration fee scam"
    tasks.append(search_news(news_query))

    tasks.append(
        web_search(
            f"{company or 'employer'} official careers hiring site",
            site_filter=None,
        )
    )

    tasks.append(
        web_search("India employment registration fee job scam labour ministry advisory")
    )

    if "amazon" in text.lower():
        tasks.append(web_search("Amazon work from home job fee scam", site_filter="amazon.jobs"))

    results = await asyncio.gather(*tasks, return_exceptions=True)

    evidence: list[EvidenceItem] = []
    if domain:
        domain_ev = check_email_domain(domain)
        if domain_ev:
            evidence.append(domain_ev)

    for r in results:
        if isinstance(r, EvidenceItem):
            evidence.append(r)
        elif isinstance(r, list):
            evidence.extend(r)

    if _mentions_upfront_fee(text):
        evidence.append(
            EvidenceItem(
                source_name="Ministry of Labour & Employment",
                source_url="https://www.labour.gov.in/",
                supports_claim=False,
                snippet="Legitimate employers do not charge registration or onboarding fees for job offers.",
            )
        )

    # Optional corpus — only if seeded; never inject unrelated banking advisories.
    rag = await retrieve_chunks(
        text + " employment fee job scam",
        "scam_corpus",
        limit=2,
        fallback=False,
    )
    evidence.extend(rag)

    # Deduplicate by source_name + snippet prefix
    seen: set[str] = set()
    unique: list[EvidenceItem] = []
    for item in evidence:
        key = f"{item.source_name}:{item.snippet[:80]}"
        if key in seen:
            continue
        seen.add(key)
        unique.append(item)
    return unique[:8]


async def run_job_agent(inp: CheckInput) -> AnnotatedVerdict:
    text = inp.text.strip()
    if is_insufficient_for_check(text):
        return await finalize_verdict(
            "job_offer", text, insufficient_input_draft("job_offer", text)
        )

    domain = _email_domain(inp.email, text)

    signals = JobSignals()
    try:
        llm = get_llm_client()
        signals = await llm.structured_json(
            system=extraction_prompt(
                "Extract job offer scam signals from the message as structured JSON."
            ),
            user=text,
            schema=JobSignals,
        )
    except Exception:
        pass

    if not domain and signals.contact_email_domain:
        domain = signals.contact_email_domain

    company = signals.company_name
    if not company:
        for brand in ("amazon", "flipkart", "tcs", "infosys", "wipro"):
            if brand in text.lower():
                company = brand.title()
                break

    evidence = await _live_job_evidence(text, domain, company)

    payment = signals.payment_requested or _mentions_upfront_fee(text)
    status = "high_risk" if payment else "medium_risk"
    if any(not e.supports_claim for e in evidence):
        status = "high_risk"

    try:
        llm = get_llm_client()
        synth = await llm.structured_json(
            system=synthesis_prompt(
                "You are SafeLine's job-offer analyst for India.",
                "Synthesize a fake-job-offer verdict from the message and LIVE evidence only. "
                "Do not cite sources not present in the evidence list.\n\n"
                "status: high_risk | medium_risk | low_risk | likely_safe | unverified",
            ),
            user=f"Offer:\n{text}\n\nSignals: {signals}\n\nEvidence:\n"
            + "\n".join(f"- {e.source_name}: {e.snippet}" for e in evidence),
            schema=JobSynthesis,
        )
        draft = VerdictDraft(
            status=coerce_verdict_status(synth.status, "job_offer"),
            confidence=synth.confidence,
            red_flags=synth.red_flags,
            evidence=evidence,
            explanation=synth.explanation,
            recommended_action=synth.recommended_action,
            needs_human_review=synth.needs_human_review or not evidence,
        )
    except Exception:
        draft = VerdictDraft(
            status=status,  # type: ignore[arg-type]
            confidence=0.85 if payment else 0.6,
            red_flags=[
                "Upfront registration fee before employment" if payment else "Unverified employer contact",
                "Sender uses non-corporate email domain"
                if domain and is_free_mail_domain(domain)
                else "Unsolicited offer pattern",
            ],
            evidence=evidence,
            explanation="This offer matches patterns commonly seen in employment-fee scams.",
            recommended_action=(
                "Do not pay any fee. Verify the employer through their official careers website. "
                "Report at cybercrime.gov.in or call 1930 if money was requested."
            ),
            needs_human_review=not evidence,
        )

    draft = enforce_uncertainty_bounds(draft, "job_offer", text)

    return await finalize_verdict("job_offer", text, draft)
