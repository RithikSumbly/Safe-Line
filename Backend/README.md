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
| GET | `/whatsapp/status` | WhatsApp config diagnostic (no secrets) |

## WhatsApp webhook setup

WhatsApp uses the **same orchestrator** as web `/chat` (`handle_chat_message` + agent tools). Conversation history is stored per phone in `whatsapp_sessions.chat_history`.

Outbound messages (templates) work once `META_WHATSAPP_TOKEN` and `META_PHONE_NUMBER_ID` are set. **Inbound replies** also need a subscribed webhook:

1. In [Meta Developer Console](https://developers.facebook.com/) → your app → **WhatsApp → Configuration**:
   - **Callback URL:** `https://<your-backend-host>/whatsapp/webhook` (HF Space: `https://celestiallord-safe-line.hf.space/whatsapp/webhook`)
   - **Verify token:** must match `META_VERIFY_TOKEN` in HF Space secrets (default: `safeline-verify-token`)
   - Subscribe to **`messages`** field
2. In HF Space **Settings → Repository secrets**, set:
   - `META_WHATSAPP_TOKEN` — permanent token from Meta
   - `META_PHONE_NUMBER_ID` — from WhatsApp → API Setup
   - `META_VERIFY_TOKEN` — same string as step 1
   - `META_APP_SECRET` — from App Settings → Basic → **App secret** (must match exactly; trailing spaces break signature verification)
3. Confirm: `GET https://<host>/whatsapp/status` shows `"ready": true`
4. **Subscribe your app to the WABA** (critical — UI alone is not enough):

   ```bash
   curl -X POST "https://graph.facebook.com/v21.0/<WABA_ID>/subscribed_apps" \
     -H "Authorization: Bearer $META_WHATSAPP_TOKEN"
   ```

   Verify with `GET /<WABA_ID>/subscribed_apps` — your app (e.g. "Safe Line") must appear.
   If only "WA DevX Webhook Events" is listed, live messages will not reach your server.
5. Send **hi** to your WhatsApp number — you should get the help menu within a few seconds.

If inbound messages are never answered, check HF Space logs for `Invalid signature` — that means `META_APP_SECRET` is wrong.

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
