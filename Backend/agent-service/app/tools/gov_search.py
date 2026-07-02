from __future__ import annotations

import logging

from app.core.schemas import EvidenceItem
from app.tools.web_search import web_search

logger = logging.getLogger(__name__)

GOV_SITES = ["pib.gov.in", "ndma.gov.in", "mausam.imd.gov.in"]


async def search_government(query: str) -> list[EvidenceItem]:
    items: list[EvidenceItem] = []
    for site in GOV_SITES:
        results = await web_search(query, site_filter=site)
        for r in results:
            r.source_name = "PIB Fact Check" if "pib" in site else r.source_name
            items.append(r)
        if items:
            break
    return items[:3]
