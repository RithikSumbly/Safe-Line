from __future__ import annotations

import logging

import httpx

from app.config import get_settings
from app.core.schemas import EvidenceItem
from app.tools.url_extract import domain_from_url

logger = logging.getLogger(__name__)


async def check_virustotal(url: str) -> EvidenceItem | None:
    key = get_settings().virustotal_api_key
    if not key:
        return None
    domain = domain_from_url(url)
    if not domain:
        return None
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            res = await client.get(
                f"https://www.virustotal.com/api/v3/domains/{domain}",
                headers={"x-apikey": key},
            )
            if res.status_code == 404:
                return EvidenceItem(
                    source_name="VirusTotal",
                    source_url="https://www.virustotal.com/",
                    supports_claim=True,
                    snippet=f"Domain {domain} not found in VirusTotal reputation database.",
                )
            res.raise_for_status()
            data = res.json()
        stats = data.get("data", {}).get("attributes", {}).get("last_analysis_stats", {})
        malicious = stats.get("malicious", 0) + stats.get("suspicious", 0)
        if malicious > 0:
            return EvidenceItem(
                source_name="VirusTotal",
                source_url="https://www.virustotal.com/",
                supports_claim=False,
                snippet=f"{malicious} security vendors classify {domain} as malicious or suspicious.",
            )
        return EvidenceItem(
            source_name="VirusTotal",
            source_url="https://www.virustotal.com/",
            supports_claim=True,
            snippet=f"No malicious classifications for {domain} in VirusTotal.",
        )
    except Exception as exc:
        logger.warning("VirusTotal check failed: %s", exc)
        return None
