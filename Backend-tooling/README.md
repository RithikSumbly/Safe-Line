# Backend tooling

Scripts, tests, eval data, and RAG seed assets for the SafeLine agent service. **Not deployed** — only [`Backend/agent-service/app/`](../Backend/agent-service/app/) ships to production (HF Space / Docker).

## Layout

```
Backend-tooling/
  scripts/          # corpus seeding, state-law ingestion CLI
  tests/            # pytest + eval harness
  data/             # eval JSONL cases, raw corpus source placeholders
  rag/              # state law manifest + sample act files for ingest
```

## Scripts

From repo root (with root `.env` configured):

```bash
cd Backend-tooling
PYTHONPATH=".:../Backend/agent-service" python scripts/seed_corpus.py
PYTHONPATH=".:../Backend/agent-service" python scripts/ingest_state_law.py --batch rag/state_law_manifest.yaml
```

## Tests

```bash
cd Backend-tooling
pytest
```

## Eval harness

```bash
cd Backend-tooling
PYTHONPATH=".:../Backend/agent-service" python tests/eval/run_eval.py
PYTHONPATH=".:../Backend/agent-service" python tests/eval/run_eval.py --agent scam --limit 5
```

Test cases: `data/eval_test_cases/*.jsonl`
