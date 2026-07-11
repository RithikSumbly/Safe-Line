"""Paths for Backend-tooling scripts and tests."""

from __future__ import annotations

import sys
from pathlib import Path

TOOLING_ROOT = Path(__file__).resolve().parent
REPO_ROOT = TOOLING_ROOT.parent
AGENT_ROOT = REPO_ROOT / "Backend" / "agent-service"
DATA_ROOT = REPO_ROOT / "data"
CORPUS_JSON = DATA_ROOT / "scam_reference_corpus.json"
DATA_TXT = DATA_ROOT / "data.txt"


def bootstrap_app_imports() -> Path:
    if str(AGENT_ROOT) not in sys.path:
        sys.path.insert(0, str(AGENT_ROOT))
    if str(TOOLING_ROOT) not in sys.path:
        sys.path.insert(0, str(TOOLING_ROOT))
    return AGENT_ROOT
