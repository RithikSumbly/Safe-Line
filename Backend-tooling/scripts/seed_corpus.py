"""Seed scam and legal reference corpus chunks (run after migrations)."""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from _paths import bootstrap_app_imports

bootstrap_app_imports()

from app.rag.ingest_corpus import ingest_legal_corpus, ingest_scam_corpus


async def main() -> None:
    from pathlib import Path
    import subprocess
    import sys

    tooling_root = Path(__file__).resolve().parents[1]
    repo_root = tooling_root.parent
    converter = tooling_root / "scripts" / "convert_data_txt_corpus.py"
    data_txt = repo_root / "data" / "data.txt"
    if data_txt.is_file() and converter.is_file():
        subprocess.run([sys.executable, str(converter)], check=False)

    n_scam = await ingest_scam_corpus()
    n_legal = await ingest_legal_corpus()
    print(f"Ingested {n_scam} scam chunks, {n_legal} legal chunks")


if __name__ == "__main__":
    asyncio.run(main())
