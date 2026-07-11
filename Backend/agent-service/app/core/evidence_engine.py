from __future__ import annotations

from app.core.schemas import AgentVerdict, EvidenceItem, VerdictStatus


def normalize_evidence(items: list[EvidenceItem], cap: int = 5) -> list[EvidenceItem]:
    seen: set[tuple[str, str | None]] = set()
    out: list[EvidenceItem] = []
    for item in items:
        key = (item.source_name.strip().lower(), item.source_url)
        if key in seen:
            continue
        seen.add(key)
        out.append(item)
        if len(out) >= cap:
            break
    return out


def apply_evidence_floor(verdict: AgentVerdict) -> AgentVerdict:
    """
    Downgrade only when there is no evidence and no substantive analysis.
    RAG is optional enrichment; heuristics, LLM reasoning, and live API/link
    checks all count — an empty vector index must not block a verdict.
    """
    if not verdict.evidence and "isn't enough detail" in verdict.explanation.lower():
        verdict.confidence = min(verdict.confidence, 0.55)
        verdict.evidence = normalize_evidence(verdict.evidence)
        return verdict

    if not verdict.evidence:
        has_analysis = bool(verdict.red_flags) and bool(verdict.explanation.strip())
        if has_analysis and verdict.agent in ("scam", "job_offer"):
            verdict.needs_human_review = verdict.confidence > 0.75
            verdict.confidence = min(verdict.confidence, 0.78)
        else:
            verdict.status = "unverified"
            verdict.confidence = min(verdict.confidence, 0.35)
            verdict.needs_human_review = True
            if "unverified" not in verdict.explanation.lower():
                verdict.explanation = (
                    "We could not retrieve corroborating sources for this claim. "
                    + verdict.explanation
                )
    verdict.evidence = normalize_evidence(verdict.evidence)
    return verdict


def risk_score_from_status(status: VerdictStatus, confidence: float) -> int:
    base = {
        "high_risk": 85,
        "medium_risk": 55,
        "low_risk": 30,
        "likely_safe": 15,
        "confirmed": 10,
        "likely_false": 80,
        "unverified": 45,
        "outdated": 40,
    }.get(status, 50)
    adj = int((1.0 - confidence) * 15)
    return max(0, min(100, base + adj))
