# SafeLine Backend

FastAPI agent service — **runtime only**. Deployable app lives in [`agent-service/`](agent-service/).

Scripts, tests, eval data, and RAG ingest assets are in [`../Backend-tooling/`](../Backend-tooling/).

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

## What ships in production

```
Backend/agent-service/
  app/              # FastAPI application package
  requirements.txt
  Dockerfile
```

Root [`Dockerfile`](../Dockerfile) (HF Space) copies only `Backend/agent-service/app` and `requirements.txt`.

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Service health |
| POST | `/agents/scam` | Scam message check |
| POST | `/agents/job_offer` | Fake job offer check |
| POST | `/agents/crisis_rumor` | Crisis rumor check |
| POST | `/agents/route` | Intent classification |
| GET/POST | `/whatsapp/webhook` | Meta WhatsApp Cloud API |

## Environment variables

All variables live in **[`.env`](../.env)** at the **repo root**.

Never put `SUPABASE_SERVICE_ROLE_KEY` in a `VITE_*` variable.

## Supabase migrations

Apply [`Frontend/supabase/migrations/`](../Frontend/supabase/migrations/) for `agent_runs`, pgvector, etc.

Corpus seeding, eval, and ingestion: see [`Backend-tooling/README.md`](../Backend-tooling/README.md).

## Docker

```bash
cd Backend/agent-service
docker build -t safeline-agent .
docker run -p 8000:8000 --env-file ../../.env safeline-agent
```

## Frontend integration

Set `VITE_API_BASE_URL=http://localhost:8000` in the Frontend env (see Frontend docs).
