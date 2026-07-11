"""Convert data/data.txt (Python corpus builder) to data/scam_reference_corpus.json."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
DATA_TXT = REPO_ROOT / "data" / "data.txt"
OUT_JSON = REPO_ROOT / "data" / "scam_reference_corpus.json"


def _load_builder_source() -> str:
    raw = DATA_TXT.read_text(encoding="utf-8")
    raw = re.sub(r"^python\s*\n", "", raw, count=1)
    raw = re.sub(
        r"\nClaude is AI and can make mistakes\..*$",
        "",
        raw,
        flags=re.DOTALL,
    )
    if "Enabling multi-factor authenticat" in raw:
        raw = raw.split('add("General cybersecurity hygiene reminder"')[0].rstrip()
    return raw


def main() -> None:
    if not DATA_TXT.is_file():
        print(f"Missing {DATA_TXT}", file=sys.stderr)
        sys.exit(1)

    namespace: dict = {}
    exec(compile(_load_builder_source(), str(DATA_TXT), "exec"), namespace)  # noqa: S102
    data = namespace.get("data") or []

    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(
        json.dumps(data, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    chunk_count = sum(len(d.get("chunks") or []) for d in data)
    print(f"Wrote {len(data)} sources, {chunk_count} chunks -> {OUT_JSON}")


if __name__ == "__main__":
    main()
