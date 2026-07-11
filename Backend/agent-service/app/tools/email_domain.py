from __future__ import annotations

from app.core.schemas import EvidenceItem

FREE_MAIL_DOMAINS = {
    "gmail.com",
    "googlemail.com",
    "yahoo.com",
    "yahoo.co.in",
    "hotmail.com",
    "outlook.com",
    "live.com",
    "rediffmail.com",
    "proton.me",
    "protonmail.com",
    "icloud.com",
}


def is_free_mail_domain(domain: str) -> bool:
    return domain.lower().strip() in FREE_MAIL_DOMAINS


def check_email_domain(domain: str) -> EvidenceItem | None:
    if not domain:
        return None
    normalized = domain.lower().strip()
    if is_free_mail_domain(normalized):
        return EvidenceItem(
            source_name="Email domain check",
            source_url=None,
            supports_claim=False,
            snippet=(
                f"Sender uses {normalized} — a free personal email provider, "
                "not a verified corporate hiring domain."
            ),
        )
    return EvidenceItem(
        source_name="Email domain check",
        source_url=None,
        supports_claim=True,
        snippet=f"Sender domain {normalized} is not a common free-mail provider.",
    )
