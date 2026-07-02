from __future__ import annotations

import logging

import httpx

from app.core.schemas import EvidenceItem
from app.tools.url_extract import domain_from_url

logger = logging.getLogger(__name__)


async def check_urlhaus(url: str) -> EvidenceItem | None:
    domain = domain_from_url(url)
    if not domain:
        return None
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            res = await client.post(
                "https://urlhaus-api.abuse.ch/v1/host/",
                data={"host": domain},
            )
            res.raise_for_status()
            data = res.json()
        if data.get("query_status") == "ok" and data.get("url_count", 0) > 0:
            return EvidenceItem(
                source_name="URLhaus",
                source_url="https://urlhaus.abuse.ch/",
                supports_claim=False,
                snippet=f"Host {domain} appears in URLhaus malware URL feed ({data.get('url_count')} URLs).",
            )
        return EvidenceItem(
            source_name="URLhaus",
            source_url="https://urlhaus.abuse.ch/",
            supports_claim=True,
            snippet=f"Host {domain} not listed in active URLhaus malware feed.",
        )
    except Exception as exc:
        logger.warning("URLhaus check failed: %s", exc)
        return None
