# Backend tooling

Offline scripts for seeding the RAG corpus into Supabase. **Not deployed** — only [`Backend/agent-service/app/`](../Backend/agent-service/app/) ships to production.

## Layout

```
Backend-tooling/
  scripts/          # corpus conversion + seeding
  _paths.py         # repo path helpers
```

Reference data lives in [`../data/`](../data/):

- Corpus builder input (regenerates JSON)
- `scam_reference_corpus.json` — embedded into pgvector via seed script
- `sample_scam_messages.csv` — supplementary labeled examples

## Scripts

From repo root (with root `.env` configured):

```bash
cd Backend-tooling
PYTHONPATH=".:../Backend/agent-service" python scripts/seed_corpus.py
```

This regenerates the corpus JSON from builder input when present, then ingests `data/scam_reference_corpus.json` via `app/rag/ingest_corpus.py`.

## Tests

- Agent-service unit tests: `Backend/agent-service/tests/` (CSRF, WhatsApp webhook, input sufficiency, Gemini schema)
- Older tooling/WhatsApp experiments may exist under `_private/tests/` (local only)
