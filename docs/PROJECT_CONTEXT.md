# SafeLine — Project Context & Implementation Summary

Internal history of how the **SafeLine** frontend and live stack were built for Himshikhar Capstone 2026.  
For architecture facts, prefer [`PROJECT_CODEBASE_DOCUMENTATION.md`](PROJECT_CODEBASE_DOCUMENTATION.md).

---

## What SafeLine is (current)

Evidence-backed trust & safety agent for India: paste or forward suspicious SMS, job offers, or crisis rumors; get a cited verdict via **web chat**, **WhatsApp**, or the **agent API**.

| Surface | Status |
|---------|--------|
| Web SPA | Live — [safe-line-khaki.vercel.app](https://safe-line-khaki.vercel.app) |
| Agent API | Live — [celestiallord-safe-line.hf.space](https://celestiallord-safe-line.hf.space) |
| WhatsApp bot | Live — Meta webhook + interactive list/buttons + screenshot OCR; Vercel relay (text / interactive / media) |
| Unified chat | Primary UX at `/chat` (legacy `/scam`, `/jobs`, `/crisis` redirect with hints) |
| Screenshots | Live — paste/attach on web; photo on WhatsApp → Vision OCR |

Design intent: calm, cited, newsroom feel — not a flashy AI SaaS landing page.

Pending UI: short replies show **Replying…**; real checks show the source-checking loader (`looksLikeLiveCheck`).

Live-verified paste texts for demos: eval fixtures under `tests/eval_cases/`. Teammate deep dive: codebase docs in this folder.

---

## Tech stack (current)

| Layer | Choice |
|-------|--------|
| Framework | Vite + React 19 + TypeScript |
| Styling | Tailwind CSS v4 + custom design tokens |
| UI primitives | shadcn-style (Radix + CVA) |
| Routing | React Router v7 |
| Auth & database | Supabase (Auth + Postgres + RLS + pgvector) |
| Agent checks | Live `POST /agents/{agent}` and `/chat/message` when `VITE_API_BASE_URL` is set; mock fallback only if unset |
| Deploy | Vercel (SPA + WhatsApp relay), Docker → Hugging Face Spaces (agent) |

---

## Design system

### Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `paper` | `#EDF0EE` | Page background |
| `ink` | `#1B2A41` | Primary text, nav, buttons |
| `verified` | `#1E6F5C` | Safe / confirmed |
| `risk` | `#B23A2E` | High-risk / false |
| `pending` | `#B8862B` | Unverified / medium |
| `line` | `#D8D5CC` | Hairline borders and dividers |

### Typography

- **Fraunces** — display headings
- **IBM Plex Sans** — body, labels, buttons
- **IBM Plex Mono** — citations, source tags, confidence, timestamps

### Layout rules

- Border radius: 10–12px
- Hairline `border-line` dividers; no drop-shadow cards by default
- Responsive down to 375px; visible keyboard focus states

### Signature component: `AnnotatedVerdictCard`

Submitted text with colored underlines + superscripts, verdict stamp, sources list, confidence/risk, recommended action, domain disclaimer. Respects `prefers-reduced-motion`.

`HeroLiveDemo` on the landing page keeps a reserved-height typewriter + mounted verdict card (opacity fade) so the hero does not flicker/shift during cycles.

---

## Implementation timeline (historical)

### Phase 1 — Greenfield frontend

Empty `Frontend/` → Vite/React/TS, Tailwind tokens, React Router, mock `checkContent()`, landing + three tool pages, about, stub auth.

### Stub migration — Firebase → Supabase

Firebase placeholders removed; Supabase client stub, migrations for `checks` / `profiles`, AuthContext placeholder.

### Phase 2 — Supabase live wiring

Connected project **Safe Line** (`fnkxabyvnqkykpnzhxrk`): Auth (email + Google), RLS, check history, dashboard WhatsApp phone link. At this stage `checkContent()` was still mock.

### Phase 3 — Live agents + multi-channel (current)

- FastAPI agent-service: scam / job_offer / crisis_rumor + chat orchestrator
- Frontend talks to HF/local API; CSRF header `X-Safeline-Client: web`
- WhatsApp Meta webhook → same orchestrator; HF → Vercel relay for Graph API TLS
- Educational safety questions answered without re-checking session history
- Capstone/public layout: `data/`, `docs/`, `tests/`; local `_private/`, `_archive/`

---

## Route map

| Route | Page | Auth |
|-------|------|------|
| `/` | Landing | Public |
| `/chat` | Unified agent chat | Public (guest OK) |
| `/scam`, `/jobs`, `/crisis` | Redirect → `/chat?hint=…` | — |
| `/about` | Responsible use | Public |
| `/sign-in`, `/sign-up` | Auth | Public |
| `/forgot-password`, `/reset-password` | Password recovery | Public |
| `/dashboard` | History + WhatsApp phone | **Protected** |

---

## Key files

```
Frontend/
├── api/whatsapp/send.ts      # Vercel Meta relay
├── supabase/migrations/
└── src/
    ├── lib/
    │   ├── supabase.ts
    │   ├── checkContent.ts   # Live agents when VITE_API_BASE_URL set
    │   ├── chatApi.ts        # /chat/message + CSRF header
    │   └── checks.ts
    ├── components/
    │   ├── AnnotatedVerdictCard.tsx
    │   ├── HeroLiveDemo.tsx
    │   └── layout/
    └── pages/                # Landing, Chat, Dashboard, auth, About
```

Root [`.env.example`](../.env.example) holds both `VITE_*` and backend secrets template.

---

## How to run

```bash
cp .env.example .env   # repo root — fill keys
cd Frontend && npm install && npm run dev   # :5173

cd Backend/agent-service
# venv + uvicorn, or Docker — see backend-setup.md
```

Production frontend: `https://safe-line-khaki.vercel.app`  
Production API: `https://celestiallord-safe-line.hf.space`

---

## What is still limited (not “missing”)

| Item | Notes |
|------|-------|
| Guest API quota | Rate-limited; `API_REQUIRE_AUTH` optional tightening |
| Meta WhatsApp | Test numbers until full Business verification |
| External API quotas | VirusTotal / NewsAPI may throttle under load |
| Streaming | No SSE yet — single-response LLM calls |
| Guest chat persistence | Browser localStorage until sign-in |

---

## Copy voice

Plain, calm, specific. No fear tactics. Buttons say what they do. Real source names. Disclaimers on every verdict.

---

*Last updated: July 2026 — reflects live Vercel/HF deploy, WhatsApp hardening, and safety-question routing (`55d5907`).*
