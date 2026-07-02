from __future__ import annotations

import logging
import re

import httpx

from app.core.schemas import EvidenceItem

logger = logging.getLogger(__name__)

LAT_LON_RE = re.compile(r"^\s*(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)\s*$")


async def geocode(location: str) -> dict[str, str | float] | None:
    if not location:
        return None
    lat_lon = LAT_LON_RE.match(location)
    if lat_lon:
        lat, lon = float(lat_lon.group(1)), float(lat_lon.group(2))
        return await _reverse_geocode(lat, lon)
    return await _forward_geocode(location)


async def _forward_geocode(place: str) -> dict[str, str | float] | None:
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            res = await client.get(
                "https://nominatim.openstreetmap.org/search",
                params={"q": place, "format": "json", "limit": 1},
                headers={"User-Agent": "SafeLine/1.0 (capstone project)"},
            )
            res.raise_for_status()
            data = res.json()
        if not data:
            return None
        item = data[0]
        return {
            "lat": float(item["lat"]),
            "lon": float(item["lon"]),
            "place_name": item.get("display_name", place),
            "district": _extract_address(item.get("address", {}), "state_district", "county"),
            "state": _extract_address(item.get("address", {}), "state"),
        }
    except Exception as exc:
        logger.warning("Forward geocode failed: %s", exc)
        return None


async def _reverse_geocode(lat: float, lon: float) -> dict[str, str | float] | None:
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            res = await client.get(
                "https://nominatim.openstreetmap.org/reverse",
                params={"lat": lat, "lon": lon, "format": "json"},
                headers={"User-Agent": "SafeLine/1.0 (capstone project)"},
            )
            res.raise_for_status()
            data = res.json()
        addr = data.get("address", {})
        return {
            "lat": lat,
            "lon": lon,
            "place_name": data.get("display_name", f"{lat}, {lon}"),
            "district": _extract_address(addr, "state_district", "county"),
            "state": _extract_address(addr, "state"),
        }
    except Exception as exc:
        logger.warning("Reverse geocode failed: %s", exc)
        return None


def _extract_address(addr: dict, *keys: str) -> str:
    for k in keys:
        if k in addr:
            return str(addr[k])
    return ""


async def location_mismatch_evidence(
    user_geo: dict | None,
    claimed_place: str,
) -> EvidenceItem | None:
    if not user_geo or not claimed_place:
        return None
    claimed = await _forward_geocode(claimed_place)
    if not claimed:
        return None
    user_state = (user_geo.get("state") or "").lower()
    claimed_state = (claimed.get("state") or "").lower()
    if user_state and claimed_state and user_state != claimed_state:
        return EvidenceItem(
            source_name="Nominatim",
            source_url="https://nominatim.openstreetmap.org/",
            supports_claim=False,
            snippet=(
                f"Claim references {claimed.get('place_name', claimed_place)} but "
                f"your location resolves to {user_geo.get('place_name', 'a different area')} — "
                "possible outdated or mislocalized forward."
            ),
        )
    return None
