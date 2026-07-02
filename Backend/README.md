# SafeLine Backend

FastAPI agent service for the SafeLine capstone — four evidence-grounded checkers plus Meta WhatsApp webhook.

## Quick start

```bash
# One env file for the whole project (repo root)
cp .env.example .env   # from repo root — fill keys once

cd Backend/agent-service
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Health check: `GET http://localhost:8000/health`

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Service health |
| POST | `/agents/scam` | Scam message check |
| POST | `/agents/job_offer` | Fake job offer check |
| POST | `/agents/crisis_rumor` | Crisis rumor check |
| POST | `/agents/rental_redflag` | Rental clause check (JSON) |
| POST | `/agents/rental_redflag/upload` | Rental check with PDF multipart |
| POST | `/agents/route` | Intent classification |
| GET/POST | `/whatsapp/webhook` | Meta WhatsApp Cloud API |

Request body (JSON agents):

```json
{ "text": "...", "url": "...", "email": "...", "location": "...", "jurisdiction": "..." }
```

Response: `AnnotatedVerdict` matching the frontend TypeScript contract.

## Environment variables

All variables live in **[`.env`](../.env)** at the **repo root** (see [`.env.example`](../.env.example)).

- **Frontend** reads `VITE_*` via Vite `envDir: ..`
- **Backend** reads the same file plus server-only keys (`SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, etc.)

Never put `SUPABASE_SERVICE_ROLE_KEY` in a `VITE_*` variable.

Restart `uvicorn` and `npm run dev` after changing `.env`.

## Supabase migrations

Apply [`Frontend/supabase/migrations/003_backend_schema.sql`](../Frontend/supabase/migrations/003_backend_schema.sql) to enable `agent_runs`, `evidence_log`, pgvector, and related tables.

Seed corpus (optional):

```bash
cd Backend/agent-service
python scripts/seed_corpus.py
```

## Eval harness

```bash
cd Backend/agent-service
python tests/eval/run_eval.py              # all agents
python tests/eval/run_eval.py --agent scam --limit 5
```

Test cases: `Backend/data/eval_test_cases/*.jsonl`

## Docker

```bash
docker build -t safeline-agent .
docker run -p 8000:8000 --env-file .env safeline-agent
```

## WhatsApp (Meta Cloud API)

1. Create Meta Business app with WhatsApp product
2. Set webhook to `https://<host>/whatsapp/webhook`
3. Configure `META_WHATSAPP_TOKEN`, `META_PHONE_NUMBER_ID`, `META_VERIFY_TOKEN`, `META_APP_SECRET`

## Frontend integration

Set in `Frontend/.env`:

```
VITE_API_BASE_URL=http://localhost:8000
VITE_WHATSAPP_NUMBER=91XXXXXXXXXX
```
