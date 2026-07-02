"""Seed scam and legal reference corpus chunks (run after migrations)."""

from __future__ import annotations

import asyncio

from app.rag.ingest_corpus import ingest_legal_corpus, ingest_scam_corpus


async def main() -> None:
    n_scam = await ingest_scam_corpus()
    n_legal = await ingest_legal_corpus()
    print(f"Ingested {n_scam} scam chunks, {n_legal} legal chunks")


if __name__ == "__main__":
    asyncio.run(main())
