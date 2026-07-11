---
title: SafeLine
sdk: docker
app_port: 7860
emoji: 🛡️
colorFrom: blue
colorTo: green
---

# SafeLine — Evidence-Backed Trust & Safety Agent for India

> Paste a suspicious SMS, job offer, or crisis rumor. Get a verdict backed by live evidence — not a guess.

**Team:** AURA · **Capstone Track:** Agentic AI — Himshikhar 2026

| Name | Roll No. | Email |
|---|---|---|
| Rithik Vimal Sumbly | 216 | rithiksumbly@gmail.com |
| Suave Krishan Doda | 234 | suavedoda@gmail.com |
| Kushagra Mathur | 136 | knsmathur25@gmail.com |
| Ruthwin Venkatesh | 184 | ruthwinvenaktesh@gmail.com |
| Tushika Gupta | 166 | Tushikagupta2@gmail.com |

| | Link |
|---|---|
| **Live app** | [safe-line-khaki.vercel.app](https://safe-line-khaki.vercel.app) |
| **Agent API** | [celestiallord-safe-line.hf.space](https://celestiallord-safe-line.hf.space) |
| **GitHub** | [github.com/RithikSumbly/Safe-Line](https://github.com/RithikSumbly/Safe-Line) |
| **Demo video** | [Google Drive](https://drive.google.com/drive/folders/1myotnp1gqGSHYxaq_1TqI0OvYxJawAu0?usp=sharing) |
| **Report / slides** | [Google Drive](https://drive.google.com/drive/folders/1umKHXYTQhLjCYjUpOcuWPBO-ODsWoFcg?usp=sharing) |

---

## 1. The Problem

Scam SMS, fake job offers, and disaster/crisis misinformation spread fastest exactly where verification tools are weakest — India's SMS and WhatsApp channels, used by hundreds of millions of people who don't have a fact-checker in their pocket. Generic chatbots hallucinate confident-sounding answers with no evidence behind them, which is worse than no answer at all in a safety context. For this problem statement, a single generic chatbot was never going to be enough — you need domain-specific agents, live verifiers, and honest uncertainty handling in one place.

**SafeLine's premise:** an AI verdict is only trustworthy if it's grounded in evidence the user can inspect, and honest about what it doesn't know. The design choices here follow directly from that constraint rather than bolting AI onto a form.

## 2. What It Does

A user forwards suspicious content through the **web app**, the **WhatsApp bot**, or the **API directly**, and gets back:

- A risk verdict (`high_risk` → `likely_safe`, or `confirmed` → `likely_false` for crisis claims)
- The specific red flags found, with the exact spans highlighted in their original message
- The evidence sources behind the verdict (not just an LLM's opinion)
- Recommended next steps, with Indian helpline numbers (cybercrime.gov.in, 1930, 112) attached where relevant

| Domain | What it checks |
|---|---|
| **Scam messages** | URL reputation (Google Safe Browsing, VirusTotal, URLhaus), Tavily web search, scam-pattern heuristics, RAG (`scam_corpus`), Gemini synthesis |
| **Job offers** | WHOIS, DNS MX, email-domain checks, NewsAPI, Tavily web search, fee-pattern detection, optional RAG, Gemini synthesis |
| **Crisis rumors** | Google Fact Check Tools, NewsAPI, GDELT, government site search (PIB / NDMA / IMD), Nominatim geolocation, crisis heuristics, Gemini synthesis |

## 2b. Verifiers by agent

### Scam agent

| Verifier | Role |
|---|---|
| Google Safe Browsing | URL phishing/malware reputation |
| VirusTotal | URL/domain threat intelligence |
| URLhaus | Known malicious URLs (abuse.ch) |
| Tavily | Contextual web search (prizes, impersonation, named schemes) |
| Scam heuristics | Pattern tags + reference snippets (FTC, RBI, India Post, etc.) |
| RAG `scam_corpus` | pgvector retrieval over seeded advisory chunks |
| Google Gemini | Signals, verdict, family rewrite, phrase highlights |

### Job-offer agent

| Verifier | Role |
|---|---|
| WHOIS | Domain age / registration signals |
| DNS MX | Mail infrastructure on sender domain |
| Email domain check | Corporate vs free-mail mismatch |
| NewsAPI | News on fake job / fee scams |
| Tavily | Careers-site and labour-advisory search |
| Fee-pattern detector | Upfront payment language |
| Ministry of Labour snippet | Employment-fee advisory (when fee detected) |
| RAG `scam_corpus` | Optional employment-scam chunks |
| Google Gemini | Signals + verdict synthesis |

### Crisis-rumor agent

| Verifier | Role |
|---|---|
| Google Fact Check Tools | Published fact-check reviews |
| NewsAPI | Breaking news on the claim |
| GDELT | Global event/news corpus |
| Government search | Tavily scoped to `pib.gov.in`, `ndma.gov.in`, `mausam.imd.gov.in` |
| Nominatim | User + claimed location geocoding |
| Location mismatch | Mislocalized / wrong-area rumor detection |
| Crisis heuristics | Exam / disaster / health rumor families |
| Google Gemini | Claim extraction, verdict, family rewrite |

**All agents:** PII strip → evidence floor → guardrails → span annotation. **WhatsApp:** Gemini Vision OCR on screenshots.

## 3. Why This Isn't "Just an LLM Wrapper"

This is the part most capstone scam-checkers skip, and it's the core engineering bet of this project. The capstone brief asks for evidence-backed verification across multiple message types — this pipeline is built to satisfy that requirement end-to-end, not as a thin wrapper around a single prompt.

**Every agent follows the same evidence-first pipeline:**

```
gather live evidence (parallel API calls)  →  LLM synthesizes a verdict grounded in that evidence  →  deterministic safety post-processing
```

Concretely, that means:

- **Structured, schema-validated LLM output** — every Gemini call returns a Pydantic-validated JSON shape, not free text to be regex-parsed
- **Evidence floor** — the system deliberately *downgrades* an overconfident verdict when it doesn't have enough evidence to back it, instead of letting the LLM sound sure when it isn't
- **PII stripping** before verdicts are stored or displayed (card numbers, OTP-like patterns)
- **Prompt-injection detection** — content pasted by users is treated as untrusted data, not instructions
- **Uncertainty bounds** — thin or ambiguous input is forced into an `unverified` status rather than a confident wrong answer
- **Character-offset span highlighting** computed in Python against the original text (not trusted to LLM-reported offsets), so the "red flag" highlights are always accurate to the source message

Taken together, these layers are what the problem statement actually demands — evidence gathering, structured reasoning, and safe output — without a materially simpler design that still holds up in production.

This pipeline runs identically whether the message arrives via the chat UI, the raw API, or WhatsApp — one orchestrator, three surfaces. Nothing in the architecture is duplicated per channel; the same agents, verifiers, and post-processing run everywhere.

## 4. Architecture

```
┌─────────────────┐     HTTPS      ┌──────────────────────────┐
│  Vite React SPA │ ──────────────►│  FastAPI Agent Service   │
│  (Vercel)       │  /chat/message │  (Docker / HF Spaces)    │
└────────┬────────┘  /agents/*     └───────────┬──────────────┘
         │                                     │
         │ Supabase client                     │ Service role
         ▼                                     ▼
┌─────────────────────────────────────────────────────────────┐
│                 Supabase (PostgreSQL + pgvector)              │
│   auth, profiles, checks, chat_*, agent_runs, evidence_log    │
└─────────────────────────────────────────────────────────────┘

WhatsApp ──► Meta Graph API webhook ──► Agent Service /whatsapp/*
                ▲
                └── Outbound relay via Vercel serverless function
```

**Orchestration flow** (single entry point for every channel):

```
message → off-topic/scope check → intent classification (command / keyword / LLM)
        → fast-path to a specialized agent when confidently checkable
        → otherwise an LLM decides: run a tool, answer educationally, or ask for clarification
        → agent: gather evidence → extract signals (LLM) → synthesize verdict (LLM)
        → finalize_verdict: PII strip → evidence floor → disclaimers → span annotation
```

## 5. Tech Stack

| Layer | Stack |
|---|---|
| Frontend | Vite 8, React 19, TypeScript, React Router 7, Tailwind CSS 4, Radix UI |
| Backend | Python 3.11, FastAPI, Pydantic v2, async/await throughout |
| AI | Google Gemini (structured JSON generation + `gemini-embedding-001`) |
| Data | Supabase (Postgres, Auth, Row-Level Security, pgvector) |
| Channels | Web chat, direct REST API, WhatsApp Cloud API (Meta webhook) |
| Deployment | Vercel (frontend + relay function), Docker → Hugging Face Spaces (agent service) |

## 6. Multi-Channel by Design

The same intelligence layer serves three different surfaces without duplicating logic:

- **Web chat** — primary UX; **guest mode** lets anyone try a check without signing in (session history stays in the browser until login)
- **Direct API** — programmatic access to the same agents (`/chat/message`, `/agents/*`)
- **WhatsApp bot** — real Meta Cloud API integration, including image OCR via Gemini vision for screenshot-based scam checks, and interactive list/button replies

This matters because SMS scams in India are consumed on WhatsApp far more than on any web dashboard — the bot isn't a bonus feature, it's arguably the primary real-world delivery channel. Shipping all three surfaces from one backend was a deliberate scope choice: the problem statement is about reaching people where the scams actually arrive.

## 7. Retrieval-Augmented Generation

- Reference corpus: [`data/scam_reference_corpus.json`](data/scam_reference_corpus.json) — RBI, NPCI, FTC-style advisories (see also [FTC job scams](https://consumer.ftc.gov/articles/job-scams))
- Embedded with `gemini-embedding-001` (1536-dim), stored in Postgres via `pgvector` with an IVFFlat index
- Seed script: `Backend-tooling/scripts/seed_corpus.py` (reads from `data/`)
- Retrieval is treated as *optional enrichment* — the evidence floor logic explicitly does not require a RAG hit, so a cold/empty vector index degrades gracefully to heuristics instead of breaking verdicts

## 8. Security Posture

**Implemented:** Supabase Auth + Row-Level Security on user data; agent API accepts verified Supabase JWTs (optional for guests); per-IP / per-user rate limiting (Upstash Redis when configured, in-memory fallback); browser CSRF protection via Origin allowlist + client header; WhatsApp webhook HMAC verification; relay-secret validation on the serverless relay; PII redaction; prompt-injection flagging; scope guardrails; CORS allowlisting; service-role keys kept server-side only.

## 9. Running Locally

```bash
# Frontend
cd Frontend && npm install && npm run dev

# Backend
cd Backend/agent-service
docker build -t safeline-agent .
docker run -p 8000:8000 --env-file .env safeline-agent
```

Required environment variables (Supabase URL/keys, `GEMINI_API_KEY`, Meta WhatsApp credentials) are documented in [`.env.example`](.env.example). Backend setup: [`docs/backend-setup.md`](docs/backend-setup.md).

## 10. Repository Structure

```
Frontend/                      Production web SPA (Vercel)
Backend/agent-service/         FastAPI multi-agent service (HF Spaces / Docker)
Backend-tooling/scripts/       Corpus seeding (offline, not deployed)
Frontend/supabase/migrations/  Database schema + pgvector
data/                          RAG reference corpus + ingestion sources
docs/                          Project report, capstone brief, setup guides
```

## Documentation

See [`docs/`](docs/) for the full report, capstone spec, backend setup, and reference data guide.

---

*Built for Himshikhar 2026 — Agentic AI Capstone.*