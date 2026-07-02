from __future__ import annotations

import logging

import dns.resolver

from app.core.schemas import EvidenceItem

logger = logging.getLogger(__name__)

FREE_MAIL = {"gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "rediffmail.com"}


async def check_mx(domain: str) -> EvidenceItem | None:
    if not domain:
        return None
    try:
        answers = dns.resolver.resolve(domain, "MX")
        hosts = [str(r.exchange).lower().rstrip(".") for r in answers]
        uses_free = any(any(f in h for f in FREE_MAIL) for h in hosts)
        if uses_free:
            return EvidenceItem(
                source_name="DNS MX lookup",
                source_url=None,
                supports_claim=False,
                snippet=f"Mail for {domain} routes through free-mail infrastructure ({', '.join(hosts[:2])}).",
            )
        return EvidenceItem(
            source_name="DNS MX lookup",
            source_url=None,
            supports_claim=True,
            snippet=f"Domain {domain} has corporate MX records: {', '.join(hosts[:2])}.",
        )
    except Exception:
        return EvidenceItem(
            source_name="DNS MX lookup",
            source_url=None,
            supports_claim=False,
            snippet=f"No valid MX records found for {domain} — email may not be corporate.",
        )
