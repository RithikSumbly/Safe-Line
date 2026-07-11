"""
PhishTank URL check — intentional no-op stub.

PhishTank's legacy checkurl API was discontinued; this module is kept as a
placeholder so a future integration (e.g. bulk feed or a replacement endpoint)
can plug in without reshaping the scam agent.

Today, scam link reputation uses Google Safe Browsing, VirusTotal, and URLhaus
(see app/agents/scam.py::_gather_url_evidence). check_phishtank is not called.

Settings.phishtank_api_key exists for forward compatibility but is unused.
"""

from __future__ import annotations

from app.core.schemas import EvidenceItem


async def check_phishtank(url: str) -> EvidenceItem | None:
    return None
