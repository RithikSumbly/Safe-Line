from __future__ import annotations

import io
import logging

from pydantic import BaseModel, Field

from app.agents.base import VerdictDraft, finalize_verdict
from app.core.llm_client import get_llm_client
from app.core.schemas import AnnotatedVerdict, CheckInput, EvidenceItem
from app.rag.retriever import retrieve_chunks

logger = logging.getLogger(__name__)


class ClauseRisk(BaseModel):
    clause_type: str
    risk_level: str
    issue: str


class RentalSynthesis(BaseModel):
    status: str
    confidence: float
    red_flags: list[str]
    explanation: str
    recommended_action: str
    needs_human_review: bool = False
    clause_risks: list[ClauseRisk] = Field(default_factory=list)


CLAUSE_TYPES = [
    "security deposit",
    "notice period",
    "lock-in",
    "rent increase",
    "maintenance",
    "early termination penalty",
    "landlord entry without notice",
    "dispute resolution",
    "stamp duty / registration",
]


def extract_pdf_text(pdf_bytes: bytes) -> str:
    try:
        import fitz

        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        parts = [page.get_text() for page in doc]
        doc.close()
        return "\n".join(parts).strip()
    except Exception as exc:
        logger.warning("PDF extraction failed: %s", exc)
        return ""


async def run_rental_agent(
    inp: CheckInput,
    pdf_bytes: bytes | None = None,
) -> AnnotatedVerdict:
    text = inp.text.strip()
    if pdf_bytes:
        extracted = extract_pdf_text(pdf_bytes)
        if extracted:
            text = extracted if not text else f"{text}\n\n{extracted}"

    jurisdiction = inp.jurisdiction or "Kerala"
    evidence: list[EvidenceItem] = []

    for clause in CLAUSE_TYPES[:4]:
        chunks = await retrieve_chunks(
            f"{clause} rental agreement tenant",
            "legal_reference",
            jurisdiction=jurisdiction,
        )
        evidence.extend(chunks[:1])

    penalty_keywords = ("forfeit entire", "without notice", "waives right", "any breach")
    hard_flags = [k for k in penalty_keywords if k in text.lower()]

    status = "high_risk" if len(hard_flags) >= 2 else "medium_risk" if hard_flags else "low_risk"

    try:
        llm = get_llm_client()
        synth = await llm.structured_json(
            system=(
                "Analyze rental agreement clauses against Indian tenancy law references. "
                "Flag one-sided clauses. status: high_risk, medium_risk, low_risk, likely_safe."
            ),
            user=(
                f"Jurisdiction: {jurisdiction}\n\nAgreement text:\n{text[:6000]}\n\n"
                f"Reference evidence:\n" + "\n".join(e.snippet for e in evidence)
            ),
            schema=RentalSynthesis,
        )
        draft = VerdictDraft(
            status=synth.status,  # type: ignore[arg-type]
            confidence=synth.confidence,
            red_flags=synth.red_flags or [c.issue for c in synth.clause_risks if c.risk_level == "red"],
            evidence=evidence,
            explanation=synth.explanation,
            recommended_action=synth.recommended_action,
            needs_human_review=synth.needs_human_review,
        )
    except Exception:
        draft = VerdictDraft(
            status=status,  # type: ignore[arg-type]
            confidence=0.75 if hard_flags else 0.5,
            red_flags=[
                "Forfeiture of entire deposit for minor delay" if "forfeit" in text.lower() else "Unusual tenant obligations",
                "Landlord entry without notice" if "without notice" in text.lower() else "Waiver of legal recourse",
            ],
            evidence=evidence,
            explanation=(
                f"Several clauses appear one-sided compared to {jurisdiction} tenancy norms and "
                "general Indian contract law on penalties and notice."
            ),
            recommended_action=(
                "Negotiate unclear clauses before signing. Consult NALSA legal aid or a tenant lawyer for red items."
            ),
            needs_human_review=not evidence,
        )

    return await finalize_verdict("rental_redflag", text[:8000], draft)
