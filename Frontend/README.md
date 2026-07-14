# SafeLine Frontend

Vite + React 19 web app for scam, job-offer, and crisis-rumor checks. Deployed on [Vercel](https://safe-line-khaki.vercel.app).

## Prerequisites

- Node.js 20+
- Running backend (local or [HF Space](https://celestiallord-safe-line.hf.space))
- Supabase project (Auth + Postgres)

## Environment

Use the **repo root** `.env` (not a secret file inside `Frontend/`).

```bash
cp .env.example .env   # from repo root
```

Frontend reads these `VITE_*` variables:

| Variable | Purpose |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key (public) |
| `VITE_API_BASE_URL` | Agent API base, e.g. `http://localhost:8000` or HF Space URL |
| `VITE_WHATSAPP_NUMBER` | WhatsApp bot number (display) |

Never put `SUPABASE_SERVICE_ROLE_KEY` or `GEMINI_API_KEY` in `VITE_*` variables.

## Run locally

```bash
cd Frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

With the backend on port 8000:

```bash
# repo root .env
VITE_API_BASE_URL=http://localhost:8000
```

## Build

```bash
npm run build    # output in dist/
npm run preview  # serve production build locally
```

## Supabase

Apply migrations before first use:

```bash
# SQL files in Frontend/supabase/migrations/
```

Auth (email/password), chat history, checks, and pgvector RAG tables are created there.

## WhatsApp relay (production)

`api/whatsapp/send.ts` is a Vercel serverless function that relays outbound WhatsApp messages from HF Spaces. Configure `META_WHATSAPP_TOKEN`, `META_PHONE_NUMBER_ID`, and `WHATSAPP_RELAY_SECRET` on Vercel (server env, not `VITE_*`). See [`docs/backend-setup.md`](../docs/backend-setup.md).

## Project layout

```
src/           React app (chat, dashboard, agent pages)
api/           Vercel serverless (WhatsApp send relay)
supabase/      Database migrations
public/        Static assets
```

More docs: [`docs/`](../docs/)
