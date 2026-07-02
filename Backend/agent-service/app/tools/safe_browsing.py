from __future__ import annotations

import logging

import httpx

from app.config import get_settings
from app.core.schemas import EvidenceItem

logger = logging.getLogger(__name__)


async def check_safe_browsing(url: str) -> EvidenceItem | None:
    key = get_settings().google_safe_browsing_key
    if not key:
        return None
    payload = {
        "client": {"clientId": "safeline", "clientVersion": "1.0"},
        "threatInfo": {
            "threatTypes": [
                "MALWARE",
                "SOCIAL_ENGINEERING",
                "UNWANTED_SOFTWARE",
                "POTENTIALLY_HARMFUL_APPLICATION",
            ],
            "platformTypes": ["ANY_PLATFORM"],
            "threatEntryTypes": ["URL"],
            "threatEntries": [{"url": url}],
        },
    }
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            res = await client.post(
                f"https://safebrowsing.googleapis.com/v4/threatMatches:find?key={key}",
                json=payload,
            )
            res.raise_for_status()
            data = res.json()
        if data.get("matches"):
            return EvidenceItem(
                source_name="Google Safe Browsing",
                source_url="https://safebrowsing.google.com/",
                supports_claim=False,
                snippet=f"URL flagged as {data['matches'][0].get('threatType', 'threat')} by Google Safe Browsing.",
            )
        return EvidenceItem(
            source_name="Google Safe Browsing",
            source_url="https://safebrowsing.google.com/",
            supports_claim=True,
            snippet="No threats detected for this URL in Google Safe Browsing.",
        )
    except Exception as exc:
        logger.warning("Safe Browsing check failed: %s", exc)
        return None
