from __future__ import annotations

import logging
from typing import Optional

from app.db.supabase_client import get_supabase

logger = logging.getLogger(__name__)


async def submit_verdict_feedback(
    run_id: str,
    helpful: bool,
    user_id: Optional[str] = None,
) -> bool:
    client = get_supabase()
    if not client:
        logger.warning("Supabase not configured — feedback not stored")
        return False

    try:
        exists = (
            client.table("agent_runs")
            .select("id")
            .eq("id", run_id)
            .maybe_single()
            .execute()
        )
        if not exists.data:
            logger.warning("Feedback rejected — unknown run_id %s", run_id)
            return False

        payload = {
            "run_id": run_id,
            "helpful": helpful,
            "user_id": user_id,
        }
        client.table("verdict_feedback").upsert(
            payload,
            on_conflict="run_id",
        ).execute()
        return True
    except Exception as exc:
        logger.error("Failed to store verdict feedback: %s", exc)
        return False
