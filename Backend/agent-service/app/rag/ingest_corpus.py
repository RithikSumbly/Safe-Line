from __future__ import annotations

import json
import logging
import uuid
from pathlib import Path

from app.config import get_settings
from app.db.supabase_client import get_supabase
from app.rag.retriever import embed_text

logger = logging.getLogger(__name__)

_COLLECTION = "scam_corpus"
_REPO_ROOT = Path(__file__).resolve().parents[4]
_CORPUS_PATH = _REPO_ROOT / "data" / "scam_reference_corpus.json"


def _chunk_text(text: str, max_len: int = 500) -> list[str]:
    text = text.strip()
    if len(text) <= max_len:
        return [text] if text else []
    parts: list[str] = []
    start = 0
    while start < len(text):
        end = min(start + max_len, len(text))
        if end < len(text):
            break_at = text.rfind(" ", start, end)
            if break_at > start + 80:
                end = break_at
        parts.append(text[start:end].strip())
        start = end
    return [p for p in parts if p]


async def _insert_chunk(
    *,
    document_id: str,
    chunk_text: str,
    metadata: dict,
) -> bool:
    client = get_supabase()
    if not client:
        logger.error("Supabase not configured — cannot ingest corpus")
        return False

    embedding = await embed_text(chunk_text)
    if not embedding:
        logger.warning("Skipping chunk (embedding failed): %s", chunk_text[:60])
        return False

    try:
        client.table("document_chunks").insert(
            {
                "document_id": document_id,
                "collection": _COLLECTION,
                "chunk_text": chunk_text,
                "embedding": embedding,
                "metadata": metadata,
            }
        ).execute()
        return True
    except Exception as exc:
        logger.error("Chunk insert failed: %s", exc)
        return False


async def ingest_scam_corpus(*, clear_existing: bool = True) -> int:
    """
    Embed and store reference scam-advisory chunks in Supabase pgvector.
    Optional enrichment for agents — not required for verdicts.
    """
    if not _CORPUS_PATH.is_file():
        logger.error("Corpus file not found: %s", _CORPUS_PATH)
        return 0

    settings = get_settings()
    if not settings.gemini_api_key:
        logger.error("GEMINI_API_KEY required to embed corpus chunks")
        return 0

    client = get_supabase()
    if not client:
        logger.error("Supabase credentials required for corpus ingest")
        return 0

    if clear_existing:
        try:
            client.table("document_chunks").delete().eq("collection", _COLLECTION).execute()
        except Exception as exc:
            logger.warning("Could not clear existing corpus: %s", exc)

    raw = json.loads(_CORPUS_PATH.read_text(encoding="utf-8"))
    inserted = 0
    total_pieces = sum(
        len(_chunk_text(c)) for doc in raw for c in (doc.get("chunks") or [])
    )
    logger.info("Embedding %s corpus chunks from %s sources…", total_pieces, len(raw))

    for doc in raw:
        doc_id = str(uuid.uuid4())
        source = doc.get("source", "Reference")
        source_url = doc.get("source_url")
        topics = doc.get("topics") or []
        for chunk in doc.get("chunks") or []:
            for piece in _chunk_text(chunk):
                ok = await _insert_chunk(
                    document_id=doc_id,
                    chunk_text=piece,
                    metadata={
                        "source": source,
                        "source_url": source_url,
                        "topics": topics,
                    },
                )
                if ok:
                    inserted += 1
                if inserted % 50 == 0 and inserted:
                    logger.info("…%s / %s chunks ingested", inserted, total_pieces)

    logger.info("Ingested %s scam corpus chunks", inserted)
    return inserted


async def ingest_legal_corpus() -> int:
    """Reserved for future legal-reference collections; schema currently uses scam_corpus only."""
    return 0
