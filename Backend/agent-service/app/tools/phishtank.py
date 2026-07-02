"""PhishTank checkurl API is discontinued / unavailable — kept as a no-op stub."""

from __future__ import annotations

from app.core.schemas import EvidenceItem


async def check_phishtank(url: str) -> EvidenceItem | None:
    return None
