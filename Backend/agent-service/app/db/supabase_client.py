from __future__ import annotations

import logging
import time
from functools import lru_cache
from typing import Any, Optional

from supabase import Client, create_client

from app.config import get_settings
from app.core.schemas import AgentType, AgentVerdict, AnnotatedVerdict, EvidenceItem

logger = logging.getLogger(__name__)


@lru_cache
def get_supabase() -> Optional[Client]:
    import os

    settings = get_settings()
    url = (
        settings.resolved_supabase_url
        or os.getenv("SUPABASE_URL")
        or os.getenv("VITE_SUPABASE_URL")
        or ""
    )
    key = settings.supabase_service_role_key or os.getenv("SUPABASE_SERVICE_ROLE_KEY") or ""
    if not url or not key:
        logger.warning(
            "Supabase credentials not configured (need SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)"
        )
        return None
    return create_client(url, key)


def normalize_phone(phone: str) -> str:
    digits = "".join(c for c in phone if c.isdigit())
    if digits.startswith("91") and len(digits) == 12:
        return digits
    if len(digits) == 10:
        return "91" + digits
    return digits


async def find_user_by_whatsapp(phone: str) -> Optional[str]:
    client = get_supabase()
    if not client:
        return None
    normalized = normalize_phone(phone)
    variants = {normalized, "+" + normalized, phone}
    try:
        for variant in variants:
            res = (
                client.table("profiles")
                .select("id")
                .eq("whatsapp_phone", variant)
                .maybe_single()
                .execute()
            )
            if res.data:
                return res.data["id"]
    except Exception as exc:
        logger.warning("WhatsApp profile lookup failed: %s", exc)
    return None


async def log_agent_run(
    *,
    agent: AgentType,
    channel: str,
    input_text: str,
    verdict: AnnotatedVerdict,
    user_id: Optional[str] = None,
    location: Optional[dict[str, Any]] = None,
    latency_ms: int = 0,
) -> Optional[str]:
    client = get_supabase()
    if not client:
        return None
    payload = {
        "user_id": user_id,
        "channel": channel,
        "agent": agent,
        "input_text": input_text[:8000],
        "input_location": location,
        "verdict": verdict.model_dump(mode="json"),
        "latency_ms": latency_ms,
    }
    try:
        res = client.table("agent_runs").insert(payload).execute()
        run_id = res.data[0]["id"] if res.data else None
        if run_id:
            for ev in verdict.evidence:
                client.table("evidence_log").insert(
                    {
                        "run_id": run_id,
                        "source_name": ev.source_name,
                        "source_url": ev.source_url,
                        "supports_claim": ev.supports_claim,
                        "snippet": ev.snippet[:2000],
                    }
                ).execute()
        return run_id
    except Exception as exc:
        logger.error("Failed to log agent run: %s", exc)
        return None


async def save_check_for_user(
    user_id: str,
    agent: AgentType,
    input_text: str,
    verdict: AnnotatedVerdict,
) -> None:
    client = get_supabase()
    if not client:
        return
    agent_verdict = AgentVerdict(**verdict.model_dump(exclude={"input_text", "flagged_spans"}))
    try:
        client.table("checks").insert(
            {
                "user_id": user_id,
                "agent": agent,
                "input_text": input_text[:8000],
                "verdict": agent_verdict.model_dump(mode="json"),
            }
        ).execute()
    except Exception as exc:
        logger.error("Failed to save check: %s", exc)


class Timer:
    def __init__(self) -> None:
        self._start = time.perf_counter()

    @property
    def elapsed_ms(self) -> int:
        return int((time.perf_counter() - self._start) * 1000)
