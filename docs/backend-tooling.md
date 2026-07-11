# Backend tooling

Offline scripts for seeding the RAG corpus into Supabase. **Not deployed** — only [`Backend/agent-service/app/`](../Backend/agent-service/app/) ships to production.

## Layout

```
Backend-tooling/
  scripts/          # corpus conversion + seeding
  _paths.py         # repo path helpers
```

Reference data lives in [`../data/`](../data/):

- `data.txt` — corpus builder source (regenerates JSON)
- `scam_reference_corpus.json` — embedded into pgvector via seed script

## Scripts

From repo root (with root `.env` configured):

```bash
cd Backend-tooling
PYTHONPATH=".:../Backend/agent-service" python scripts/seed_corpus.py
```

This runs `convert_data_txt_corpus.py` when `data/data.txt` exists, then ingests `data/scam_reference_corpus.json`.

## Tests

WhatsApp buffering/classifier tests were moved to `_private/tests/backend-tooling/` (local dev only, not part of submission).
