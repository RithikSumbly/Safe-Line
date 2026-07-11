from __future__ import annotations

from app.core.schemas import AgentType, VerdictStatus

_SCAM_STATUSES: frozenset[str] = frozenset(
    {"high_risk", "medium_risk", "low_risk", "likely_safe", "unverified"}
)
_CRISIS_STATUSES: frozenset[str] = frozenset(
    {"confirmed", "likely_false", "outdated", "unverified"}
)
_JOB_STATUSES: frozenset[str] = frozenset(
    {"high_risk", "medium_risk", "low_risk", "likely_safe", "unverified"}
)

_SCAM_ALIASES: dict[str, VerdictStatus] = {
    "malicious": "high_risk",
    "scam": "high_risk",
    "phishing": "high_risk",
    "fraud": "high_risk",
    "dangerous": "high_risk",
    "critical": "high_risk",
    "suspicious": "medium_risk",
    "caution": "medium_risk",
    "safe": "likely_safe",
    "legitimate": "likely_safe",
}

_CRISIS_ALIASES: dict[str, VerdictStatus] = {
    "false": "likely_false",
    "fake": "likely_false",
    "debunked": "likely_false",
    "misinformation": "likely_false",
    "flagged": "unverified",
    "suspicious": "unverified",
    "uncertain": "unverified",
    "unknown": "unverified",
    "true": "confirmed",
    "verified": "confirmed",
    "out_of_date": "outdated",
    "stale": "outdated",
}

_JOB_ALIASES: dict[str, VerdictStatus] = {
    "malicious": "high_risk",
    "scam": "high_risk",
    "fraud": "high_risk",
    "suspicious": "medium_risk",
    "safe": "likely_safe",
    "legitimate": "likely_safe",
}

_DEFAULTS: dict[AgentType, VerdictStatus] = {
    "scam": "medium_risk",
    "crisis_rumor": "unverified",
    "job_offer": "medium_risk",
}

_ALLOWED: dict[AgentType, frozenset[str]] = {
    "scam": _SCAM_STATUSES,
    "crisis_rumor": _CRISIS_STATUSES,
    "job_offer": _JOB_STATUSES,
}

_ALIASES: dict[AgentType, dict[str, VerdictStatus]] = {
    "scam": _SCAM_ALIASES,
    "crisis_rumor": _CRISIS_ALIASES,
    "job_offer": _JOB_ALIASES,
}


def coerce_verdict_status(raw: str, agent: AgentType) -> VerdictStatus:
    """Map LLM status strings onto allowed VerdictStatus values."""
    normalized = raw.strip().lower().replace(" ", "_").replace("-", "_")
    allowed = _ALLOWED[agent]
    if normalized in allowed:
        return normalized  # type: ignore[return-value]
    mapped = _ALIASES[agent].get(normalized)
    if mapped:
        return mapped
    return _DEFAULTS[agent]
