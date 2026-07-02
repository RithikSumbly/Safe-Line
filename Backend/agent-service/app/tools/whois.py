from __future__ import annotations

import logging
from datetime import datetime

import httpx

from app.core.schemas import EvidenceItem

logger = logging.getLogger(__name__)


async def whois_lookup(domain: str) -> EvidenceItem | None:
    if not domain:
        return None
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            res = await client.get(
                f"https://whoisjson.com/api/v1/whois?domain={domain}",
            )
            if res.status_code != 200:
                return None
            data = res.json()
        created = data.get("created") or data.get("creation_date")
        age_days = None
        if created:
            try:
                dt = datetime.fromisoformat(str(created).replace("Z", "+00:00"))
                age_days = (datetime.now(dt.tzinfo) - dt).days
            except Exception:
                pass
        if age_days is not None and age_days < 90:
            return EvidenceItem(
                source_name="WHOIS",
                source_url=f"https://whoisjson.com/",
                supports_claim=False,
                snippet=f"Domain {domain} was registered approximately {age_days} days ago — unusually new for a major employer.",
            )
        return EvidenceItem(
            source_name="WHOIS",
            source_url="https://whoisjson.com/",
            supports_claim=True,
            snippet=f"Domain {domain} has WHOIS registration on file.",
        )
    except Exception as exc:
        logger.warning("WHOIS lookup failed: %s", exc)
        return None
