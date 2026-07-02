from __future__ import annotations

import logging
from typing import Optional

import google.generativeai as genai

from app.config import get_settings
from app.core.schemas import EvidenceItem

logger = logging.getLogger(__name__)


def _get_embed_model():
    settings = get_settings()
    genai.configure(api_key=settings.gemini_api_key)
    return settings.gemini_model.replace("flash", "embedding-001") if "flash" in settings.gemini_model else "text-embedding-004"


async def embed_text(text: str) -> list[float]:
    settings = get_settings()
    if not settings.gemini_api_key:
        return []
    try:
        result = genai.embed_content(
            model="models/text-embedding-004",
            content=text[:8000],
            task_type="retrieval_document",
        )
        return list(result["embedding"])
    except Exception as exc:
        logger.warning("Embedding failed: %s", exc)
        return []


async def retrieve_chunks(
    query: str,
    collection: str,
    *,
    jurisdiction: Optional[str] = None,
    limit: int = 5,
) -> list[EvidenceItem]:
    from app.db.supabase_client import get_supabase

    client = get_supabase()
    if not client:
        return _fallback_corpus(collection, jurisdiction)

    embedding = await embed_text(query)
    if not embedding:
        return _fallback_corpus(collection, jurisdiction)

    try:
        params: dict = {
            "query_embedding": embedding,
            "match_collection": collection,
            "match_count": limit,
        }
        if jurisdiction and collection == "legal_reference":
            params["match_jurisdiction"] = jurisdiction
        res = client.rpc("match_document_chunks", params).execute()
        items: list[EvidenceItem] = []
        for row in res.data or []:
            meta = row.get("metadata") or {}
            act = meta.get("act_name", collection)
            section = meta.get("section", "")
            tier = meta.get("tier", "")
            items.append(
                EvidenceItem(
                    source_name="India Code" if collection == "legal_reference" else "RBI",
                    source_url="https://www.indiacode.nic.in/" if collection == "legal_reference" else "https://www.rbi.org.in/",
                    supports_claim=True,
                    snippet=f"{act} {section} (Tier {tier}): {(row.get('chunk_text') or '')[:300]}",
                )
            )
        return items
    except Exception as exc:
        logger.warning("Vector retrieval failed: %s", exc)
        return _fallback_corpus(collection, jurisdiction)


def _fallback_corpus(collection: str, jurisdiction: Optional[str]) -> list[EvidenceItem]:
    """Built-in reference snippets when pgvector RPC is unavailable."""
    if collection == "scam_corpus":
        return [
            EvidenceItem(
                source_name="RBI",
                source_url="https://www.rbi.org.in/",
                supports_claim=False,
                snippet="RBI advisories state banks do not ask for KYC updates via SMS links or OTP sharing.",
            ),
        ]
    if collection == "legal_reference":
        return [
            EvidenceItem(
                source_name="India Code",
                source_url="https://www.indiacode.nic.in/",
                supports_claim=True,
                snippet="Indian Contract Act, 1872 §74: compensation for breach must not amount to a penalty unrelated to probable loss.",
            ),
            EvidenceItem(
                source_name="NALSA",
                source_url="https://nalsa.gov.in/",
                supports_claim=True,
                snippet="Tenants should verify notice periods, deposit refund timelines, and registration requirements before signing.",
            ),
        ]
    return []
