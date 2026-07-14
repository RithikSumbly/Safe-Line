# SafeLine Backend

FastAPI agent service — **runtime only**. Deployable app lives in [`Backend/agent-service/`](../Backend/agent-service/).

Scripts and RAG ingest: [`Backend-tooling/`](../Backend-tooling/). Corpus files: [`data/`](../data/).

## Quick start

```bash
# One env file for the whole project (repo root)
cp .env.example .env   # fill keys once

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
  app/              # FastAPI application package (incl. app/security/)
  requirements.txt
  Dockerfile
```

Root `Dockerfile` (HF Space) copies `Backend/agent-service/app` and `requirements.txt`. README YAML frontmatter must keep `sdk: docker` / `app_port: 7860` for HF builds.

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Service health |
| POST | `/agents/scam` | Scam message check |
| POST | `/agents/job_offer` | Fake job offer check |
| POST | `/agents/crisis_rumor` | Crisis rumor check |
| POST | `/agents/route` | Intent classification |
| POST | `/chat/message` | Conversational orchestrator (web + WhatsApp intelligence) |
| POST | `/feedback` | Verdict helpfulness |
| GET/POST | `/whatsapp/webhook` | Meta WhatsApp Cloud API |
| GET | `/whatsapp/status` | WhatsApp config diagnostic (no secrets) |

Browser POSTs to chat/agents/feedback require allowlisted `Origin` + header `X-Safeline-Client: web` when `API_CSRF_ENABLED=true`. Paths under `/whatsapp*` skip CSRF (Meta HMAC / relay secret instead). Builtin origins always include localhost and `https://safe-line-khaki.vercel.app`.

## Orchestrator notes

- Educational questions (`looks_like_safety_question`) → `answer_safety_question` (no verdict, no history reuse).
- Short follow-ups may reuse a prior pasted message; safety/meta questions will not.
- WhatsApp inbound message IDs are deduplicated so Meta retries do not double-reply.
- Web + WhatsApp accept screenshots → Gemini Vision OCR → `[Screenshot text]: …` into the same orchestrator.

## WhatsApp UX

- **Interactive list** on `hi` / `HELP` / `MENU` / empty inbound: Scam, Job, Crisis, How it works, Reset.
- Reset row description: *Wipe history so a new paste isn't mixed with old messages.*
- After a verdict: reply buttons **Open menu** / **Reset chat**.
- Photos/screenshots: OCR via `vision.extract_text_from_screenshot` (media download uses Vercel relay on HF).
- Code: `whatsapp/interactive.py`, `whatsapp/pipeline.py`; relay actions: `send`, `send_message`, `download_media`.

## WhatsApp webhook setup

WhatsApp uses the **same orchestrator** as web `/chat`. History per phone in `whatsapp_sessions.chat_history`.

1. Meta Developer Console → WhatsApp → Configuration:
   - **Callback URL:** `https://celestiallord-safe-line.hf.space/whatsapp/webhook`
   - **Verify token:** must match `META_VERIFY_TOKEN`
   - Subscribe to **`messages`**
2. HF Space secrets: `META_WHATSAPP_TOKEN`, `META_PHONE_NUMBER_ID`, `META_VERIFY_TOKEN`, `META_APP_SECRET`
3. `GET /whatsapp/status` → `"ready": true`
4. Subscribe the app to the WABA:

   ```bash
   curl -X POST "https://graph.facebook.com/v21.0/<WABA_ID>/subscribed_apps" \
     -H "Authorization: Bearer $META_WHATSAPP_TOKEN"
   ```

5. **HF Spaces relay** (required for live replies — HF cannot TLS to Graph):

   - Vercel server env: `META_WHATSAPP_TOKEN`, `META_PHONE_NUMBER_ID`, `WHATSAPP_RELAY_SECRET`
   - HF secrets: `WHATSAPP_SEND_RELAY_URL=https://safe-line-khaki.vercel.app/api/whatsapp/send`, same `WHATSAPP_RELAY_SECRET`
   - Status must show `relay_configured: true`
   - Relay handles text (`send`), interactive menus (`send_message`), and inbound media (`download_media`)

6. Send **hi** — HELP text + selectable **Choose** list within a few seconds.

If inbound messages are ignored, check HF logs for `Invalid signature` (`META_APP_SECRET` mismatch).

**Demo pastes:** eval fixtures under `tests/eval_cases/`

## Environment variables

All variables live in **[`.env`](../.env)** at the **repo root**. See [`.env.example`](../.env.example) for `API_*` CSRF/rate-limit flags. Never put `SUPABASE_SERVICE_ROLE_KEY` in a `VITE_*` variable.

## Supabase migrations

Apply [`Frontend/supabase/migrations/`](../Frontend/supabase/migrations/) for `agent_runs`, pgvector, etc.

Corpus seeding: [`backend-tooling.md`](backend-tooling.md).

## Docker

```bash
cd Backend/agent-service
docker build -t safeline-agent .
docker run -p 8000:8000 --env-file ../.env safeline-agent
```

## Frontend integration

Set `VITE_API_BASE_URL` in the root `.env` (local `http://localhost:8000` or the HF Space URL). Frontend sends `X-Safeline-Client: web` on API fetches.
