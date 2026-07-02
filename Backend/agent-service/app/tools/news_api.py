from __future__ import annotations

import logging
from datetime import datetime, timedelta

import httpx

from app.config import get_settings
from app.core.schemas import EvidenceItem

logger = logging.getLogger(__name__)


async def search_news(query: str, location: str = "") -> list[EvidenceItem]:
    key = get_settings().newsapi_key
    if not key:
        return []
    since = (datetime.utcnow() - timedelta(hours=72)).isoformat() + "Z"
    q = f"{query} {location}".strip()
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            res = await client.get(
                "https://newsapi.org/v2/everything",
                params={
                    "q": q[:200],
                    "from": since,
                    "sortBy": "publishedAt",
                    "pageSize": 5,
                    "apiKey": key,
                },
            )
            res.raise_for_status()
            data = res.json()
        items: list[EvidenceItem] = []
        for art in data.get("articles", [])[:3]:
            items.append(
                EvidenceItem(
                    source_name="NewsAPI",
                    source_url=art.get("url"),
                    supports_claim=True,
                    snippet=f"{art.get('source', {}).get('name', 'News')}: {art.get('title', '')[:200]}",
                )
            )
        return items
    except Exception as exc:
        logger.warning("NewsAPI failed: %s", exc)
        return []
