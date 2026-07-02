from __future__ import annotations

import logging
from datetime import datetime

import httpx

from app.config import get_settings
from app.core.schemas import EvidenceItem

logger = logging.getLogger(__name__)


async def check_fact_check(query: str) -> list[EvidenceItem]:
    key = get_settings().google_fact_check_key
    if not key:
        return []
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            res = await client.get(
                "https://factchecktools.googleapis.com/v1alpha1/claims:search",
                params={"query": query[:500], "key": key, "languageCode": "en"},
            )
            res.raise_for_status()
            data = res.json()
        items: list[EvidenceItem] = []
        for claim in data.get("claims", [])[:3]:
            reviews = claim.get("claimReview", [])
            for review in reviews[:1]:
                rating = (review.get("textualRating") or "").lower()
                supports = rating in ("false", "mostly false", "pants on fire")
                items.append(
                    EvidenceItem(
                        source_name="Google Fact Check Tools",
                        source_url=review.get("url"),
                        supports_claim=not supports,
                        snippet=(
                            f"{review.get('publisher', {}).get('name', 'Fact checker')}: "
                            f"{review.get('textualRating', 'reviewed')} — "
                            f"{claim.get('text', '')[:200]}"
                        ),
                    )
                )
        return items
    except Exception as exc:
        logger.warning("Fact Check API failed: %s", exc)
        return []
