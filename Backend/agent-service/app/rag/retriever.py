from __future__ import annotations

import logging

import google.generativeai as genai

from app.config import get_settings
from app.core.schemas import EvidenceItem

logger = logging.getLogger(__name__)

EMBED_MODEL = "models/gemini-embedding-001"
EMBED_DIMENSIONS = 1536


async def embed_text(text: str) -> list[float]:
    settings = get_settings()
    if not settings.gemini_api_key:
        return []
    try:
        genai.configure(api_key=settings.gemini_api_key)
        result = genai.embed_content(
            model=EMBED_MODEL,
            content=text[:8000],
            task_type="retrieval_document",
            output_dimensionality=EMBED_DIMENSIONS,
        )
        return list(result["embedding"])
    except Exception as exc:
        logger.warning("Embedding failed: %s", exc)
        return []


async def retrieve_chunks(
    query: str,
    collection: str,
    *,
    limit: int = 5,
    fallback: bool = True,
) -> list[EvidenceItem]:
    """
    Generic retrieval used by the 3 remaining agents.
    Only supports the shared reference collections (e.g. scam_corpus).
    """
    from app.db.supabase_client import get_supabase

    client = get_supabase()
    if not client:
        return _fallback_evidence(collection) if fallback else []

    embedding = await embed_text(query)
    if not embedding:
        return _fallback_evidence(collection) if fallback else []

    try:
        params: dict = {
            "query_embedding": embedding,
            "match_collection": collection,
            "match_count": limit,
        }
        res = client.rpc("match_document_chunks", params).execute()
        items: list[EvidenceItem] = []
        for row in res.data or []:
            meta = row.get("metadata") or {}
            items.append(
                EvidenceItem(
                    source_name=str(meta.get("source") or meta.get("act_name") or collection),
                    source_url=meta.get("source_url"),
                    supports_claim=True,
                    snippet=(row.get("chunk_text") or "")[:400],
                )
            )
        return items or (_fallback_evidence(collection) if fallback else [])
    except Exception as exc:
        logger.warning("Vector retrieval failed: %s", exc)
        return _fallback_evidence(collection) if fallback else []


def _fallback_evidence(collection: str) -> list[EvidenceItem]:
    if collection == "scam_corpus":
        return [
            EvidenceItem(
                source_name="FTC — Prize and lottery scams",
                source_url="https://consumer.ftc.gov/articles/prize-and-lottery-scams",
                supports_claim=False,
                snippet=(
                    "Unexpected prize messages that ask you to pay, subscribe, or click "
                    "a link are a common scam — legitimate prizes do not work this way."
                ),
            ),
        ]
    return []
