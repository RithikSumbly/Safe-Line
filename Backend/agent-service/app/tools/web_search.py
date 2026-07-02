from __future__ import annotations

import logging

import httpx

from app.config import get_settings
from app.core.schemas import EvidenceItem

logger = logging.getLogger(__name__)


async def web_search(
    query: str,
    *,
    site_filter: str | None = None,
) -> list[EvidenceItem]:
    key = get_settings().tavily_api_key
    if not key:
        return []
    q = f"site:{site_filter} {query}" if site_filter else query
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            res = await client.post(
                "https://api.tavily.com/search",
                json={
                    "api_key": key,
                    "query": q,
                    "max_results": 3,
                    "include_answer": False,
                },
            )
            res.raise_for_status()
            data = res.json()
        items: list[EvidenceItem] = []
        for r in data.get("results", [])[:3]:
            items.append(
                EvidenceItem(
                    source_name="Web search",
                    source_url=r.get("url"),
                    supports_claim=True,
                    snippet=(r.get("content") or r.get("title") or "")[:400],
                )
            )
        return items
    except Exception as exc:
        logger.warning("Web search failed: %s", exc)
        return []
