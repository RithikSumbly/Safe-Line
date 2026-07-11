from __future__ import annotations

import re

from app.core.schemas import AgentType, AgentVerdict

PII_PATTERNS = [
    re.compile(r"\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b"),
    re.compile(r"(?i)\b(otp|password|pin)\s*[:=]?\s*\S+"),
    re.compile(r"\b\d{12}\b"),
]

CLICK_VERIFY = re.compile(
    r"(?i)\b(click|tap|open)\s+(the\s+)?(link|url)\b.*\b(verify|confirm)\b"
)

DISCLAIMERS: dict[AgentType, str] = {
    "scam": (
        "Automated check only. For account issues, contact your bank using "
        "the number on your card or passbook."
    ),
    "job_offer": (
        "This is not an employment verification service. Confirm offers only "
        "through the employer's official careers portal."
    ),
    "crisis_rumor": (
        "Verify with official disaster management and government sources "
        "before acting on forwarded claims."
    ),
}


def strip_pii(text: str) -> str:
    out = text
    for pat in PII_PATTERNS:
        out = pat.sub("[REDACTED]", out)
    return out


_BANKISH = re.compile(r"(?i)\b(bank|kyc|otp|upi|account|card|passbook)\b")


def apply_guardrails(verdict: AgentVerdict) -> AgentVerdict:
    if verdict.agent == "scam":
        if _BANKISH.search(verdict.recommended_action) or any(
            _BANKISH.search(f) for f in verdict.red_flags
        ):
            verdict.disclaimer = DISCLAIMERS["scam"]
        else:
            verdict.disclaimer = (
                "Automated check only. Verify through official apps or helplines — "
                "not links or numbers in suspicious messages."
            )
    else:
        verdict.disclaimer = DISCLAIMERS.get(verdict.agent, verdict.disclaimer)

    if CLICK_VERIFY.search(verdict.recommended_action):
        verdict.recommended_action = (
            "Do not click links in the message. Contact the organization "
            "through their official website or app instead."
        )

    if verdict.agent in ("scam", "job_offer") and verdict.status in (
        "high_risk",
        "likely_false",
    ):
        if verdict.agent == "scam" and not _BANKISH.search(
            " ".join(verdict.red_flags) + verdict.recommended_action
        ):
            pass
        elif "cybercrime" not in verdict.recommended_action.lower():
            verdict.recommended_action += (
                " Report at cybercrime.gov.in or call 1930 if money was requested."
            )

    if verdict.agent == "crisis_rumor" and verdict.status == "unverified":
        if "1930" not in verdict.recommended_action and "112" not in verdict.recommended_action:
            verdict.recommended_action = (
                "If you are in immediate danger, call 112 or your local emergency number. "
                + verdict.recommended_action
            )

    return verdict
