from __future__ import annotations

import logging
from typing import Optional

from app.db.supabase_client import get_supabase
from app.rag.retriever import embed_text

logger = logging.getLogger(__name__)

SCAM_CHUNKS = [
    {
        "text": "RBI has cautioned the public that banks never ask customers to share OTP, PIN, or passwords via SMS links for KYC updates.",
        "metadata": {"source": "RBI", "topic": "kyc_phishing"},
    },
    {
        "text": "Cybercrime authorities report fake bank alert SMS messages using urgency and account suspension threats with third-party links.",
        "metadata": {"source": "cybercrime.gov.in", "topic": "bank_sms"},
    },
    {
        "text": "Employment scams often request registration or training fees before any verified interview with the claimed employer.",
        "metadata": {"source": "FTC", "topic": "job_fee"},
    },
]

LEGAL_CHUNKS = [
    {
        "text": "Section 74 of the Indian Contract Act, 1872 limits compensation for breach — a clause forfeiting an entire deposit for minor delay may be an unenforceable penalty.",
        "metadata": {"act_name": "Indian Contract Act, 1872", "section": "§74", "tier": "1", "jurisdiction": "India"},
    },
    {
        "text": "Section 17 of the Registration Act, 1908 requires registration of leases exceeding one year to be admissible as evidence in disputes.",
        "metadata": {"act_name": "Registration Act, 1908", "section": "§17", "tier": "1", "jurisdiction": "India"},
    },
    {
        "text": "Kerala tenancy practice expects reasonable notice periods and defined deposit refund timelines; one-sided forfeiture clauses are commonly challenged.",
        "metadata": {"act_name": "Kerala Rent Act guidance", "section": "", "tier": "2", "jurisdiction": "Kerala"},
    },
    {
        "text": "NALSA guidance: tenants should verify stamp duty, registration status, and dispute resolution clauses before signing rental agreements.",
        "metadata": {"act_name": "NALSA", "section": "", "tier": "3", "jurisdiction": "India"},
    },
    {
        "text": "Delhi Rent Control Act norms include limits on arbitrary eviction and requirements for lawful notice before termination.",
        "metadata": {"act_name": "Delhi Rent Control Act", "section": "", "tier": "2", "jurisdiction": "Delhi"},
    },
    {
        "text": "Maharashtra rent control provisions address standard lease terms and tenant protections against excessive lock-in periods.",
        "metadata": {"act_name": "Maharashtra Rent Control Act", "section": "", "tier": "2", "jurisdiction": "Maharashtra"},
    },
]


async def _insert_chunks(collection: str, chunks: list[dict]) -> int:
    client = get_supabase()
    if not client:
        logger.warning("Supabase not configured — skipping ingest")
        return 0
    count = 0
    for chunk in chunks:
        embedding = await embed_text(chunk["text"])
        if not embedding:
            continue
        try:
            client.table("document_chunks").insert(
                {
                    "collection": collection,
                    "chunk_text": chunk["text"],
                    "embedding": embedding,
                    "metadata": chunk.get("metadata", {}),
                }
            ).execute()
            count += 1
        except Exception as exc:
            logger.warning("Chunk insert failed: %s", exc)
    return count


async def ingest_scam_corpus() -> int:
    return await _insert_chunks("scam_corpus", SCAM_CHUNKS)


async def ingest_legal_corpus(jurisdiction: Optional[str] = None) -> int:
    chunks = LEGAL_CHUNKS
    if jurisdiction:
        chunks = [c for c in LEGAL_CHUNKS if c["metadata"].get("jurisdiction") in (jurisdiction, "India")]
    return await _insert_chunks("legal_reference", chunks)
