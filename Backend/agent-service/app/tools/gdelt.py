from __future__ import annotations

import logging

import httpx

from app.core.schemas import EvidenceItem

logger = logging.getLogger(__name__)


async def search_gdelt(query: str) -> list[EvidenceItem]:
    try:
        async with httpx.AsyncClient(timeout=25.0) as client:
            res = await client.get(
                "https://api.gdeltproject.org/api/v2/doc/doc",
                params={
                    "query": query[:200],
                    "mode": "ArtList",
                    "maxrecords": 5,
                    "format": "json",
                },
            )
            res.raise_for_status()
            data = res.json()
        items: list[EvidenceItem] = []
        for art in data.get("articles", [])[:3]:
            items.append(
                EvidenceItem(
                    source_name="GDELT",
                    source_url=art.get("url"),
                    supports_claim=True,
                    snippet=f"{art.get('title', '')[:200]} ({art.get('seendate', '')})",
                )
            )
        return items
    except Exception as exc:
        logger.warning("GDELT search failed: %s", exc)
        return []
