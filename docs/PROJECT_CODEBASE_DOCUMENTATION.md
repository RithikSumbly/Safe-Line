# SafeLine — Project Codebase Documentation

**Generated from source code only.** Existing markdown, wiki, and comment-only documentation were not used as sources of truth.

---

## 1. Executive Summary

### What this project does

SafeLine is a trust-and-safety platform focused on **India**. End users paste or forward suspicious content — scam SMS/phishing messages, fake job offers, and crisis/disaster rumors — and receive an **evidence-backed verdict** with red flags, recommended actions, source citations, and highlighted spans in the original text.

The system operates through:

1. **Web chat UI** (primary user surface)
2. **Direct agent API** (programmatic checks)
3. **WhatsApp Cloud API bot** (Meta webhook integration)

### Who uses it

- **General public**: Can use `/chat` without signing in; guests get ephemeral session IDs in `localStorage`.
- **Registered users**: Email/password auth via Supabase; saved check history, chat session persistence, WhatsApp phone linking on `/dashboard`.
- **WhatsApp users**: Message the configured business number; optionally linked to web accounts via `profiles.whatsapp_phone`.

### Main capabilities

| Capability | Implementation |
|------------|----------------|
| Scam message analysis | `run_scam_agent` — heuristics, URL threat APIs, RAG, web search, LLM synthesis |
| Job offer analysis | `run_job_agent` — email domain/MX/WHOIS, news/web search, fee detection |
| Crisis rumor analysis | `run_crisis_agent` — fact-check, news, GDELT, gov search, geocoding |
| Conversational routing | `handle_chat_message` orchestrator with intent classification |
| WhatsApp channel | Meta webhook → same orchestrator → formatted reply |
| User history | Supabase `checks`, `chat_sessions`, `chat_messages` |
| Verdict feedback | `POST /feedback` → `verdict_feedback` table |
| RAG enrichment | pgvector `document_chunks` + Gemini embeddings (optional) |

### Major technologies

- **Frontend (production)**: Vite 8, React 19, TypeScript, React Router 7, Tailwind CSS 4, Radix UI primitives, Supabase JS client
- **Backend**: Python 3.11, FastAPI, Uvicorn, Pydantic v2, Google Generative AI (Gemini)
- **Database**: Supabase (PostgreSQL + Auth + pgvector extension)
- **Deployment**: Vercel (frontend SPA + WhatsApp relay function), Docker (agent service), Hugging Face Spaces (referenced in WhatsApp status URL)

### High-level architecture

```
┌─────────────────┐     HTTPS      ┌──────────────────────────┐
│  Vite React SPA │ ──────────────►│  FastAPI Agent Service   │
│  (Vercel)       │  /chat/message │  (Docker / HF Spaces)    │
└────────┬────────┘  /agents/*    └───────────┬──────────────┘
         │                                    │
         │ Supabase client                    │ Service role
         ▼                                    ▼
┌─────────────────────────────────────────────────────────────┐
│                    Supabase (PostgreSQL)                     │
│  auth.users, profiles, checks, chat_*, agent_runs, RAG, ...  │
└─────────────────────────────────────────────────────────────┘

WhatsApp ──► Meta Graph API webhook ──► Agent Service /whatsapp/*
                ▲
                └── Outbound relay: Vercel /api/whatsapp/send (HF Spaces workaround)
```

### Archived / local-only material

Earlier experiments (including a separate Next.js app formerly under `Project 2/`) live in **`_archive/`** (gitignored local). Full eval fixtures and working notes live under **`_private/`**. Neither ships in the public/capstone submission.

---

## 2. Repository Structure

| Directory | Purpose |
|-----------|---------|
| `Frontend/` | Production web SPA (Vercel) + WhatsApp relay (`api/whatsapp/`) |
| `Backend/agent-service/` | FastAPI multi-agent service (Docker / HF Spaces) |
| `Backend-tooling/scripts/` | Offline RAG seed scripts (not deployed) |
| `Frontend/supabase/migrations/` | SafeLine schema, RLS, pgvector |
| `data/` | RAG corpus JSON + sample CSV + corpus builder input |
| `docs/` | Public project report, brief, setup guides |
| `tests/eval_cases/` | Public eval stubs (JSONL) |
| `_private/` | Local-only: full eval, docs drafts, private tests |
| `_archive/` | Local-only archived apps / old TESTS tree |
| `scripts/` | Capstone push helpers (local) |
| `.vercel/` | Vercel project linkage metadata |

**Relationship**: `Frontend` and `Backend/agent-service` share one Supabase project. `Backend-tooling` seeds RAG into that Supabase from `data/`.

---

## 3. Technology Stack

### Languages

| Language | Where | Why |
|----------|-------|-----|
| TypeScript | `Frontend/src`, `Frontend/api` | Type-safe UI and serverless handlers |
| Python 3.11 | `Backend/agent-service` | AI orchestration, tool integrations, FastAPI |
| SQL | `Frontend/supabase/migrations` | Schema, RLS, vector search RPC |

### Frontend (SafeLine)

| Package | Version (from `Frontend/package.json`) | Role |
|---------|----------------------------------------|------|
| `vite` | ^8.1.1 | Dev server and production bundler |
| `react` / `react-dom` | ^19.2.7 | UI framework |
| `react-router-dom` | ^7.18.1 | Client-side routing |
| `@supabase/supabase-js` | ^2.110.0 | Auth and database client |
| `tailwindcss` + `@tailwindcss/vite` | ^4.3.2 | Utility-first styling |
| `@radix-ui/*` | various | Accessible UI primitives (button, select, label, slot) |
| `lucide-react` | ^1.22.0 | Icons |
| `@vercel/node` | ^5.5.15 (dev) | Types for serverless WhatsApp relay |
| `oxlint` | ^1.71.0 | Linting |

**No** Redux, Zustand, TanStack Query, or Next.js in the production frontend.

### Backend (agent-service)

| Package | Role |
|---------|------|
| `fastapi` + `uvicorn` | HTTP API |
| `pydantic` + `pydantic-settings` | Schemas and configuration |
| `google-generativeai` | Gemini LLM + embeddings |
| `httpx` | Async HTTP for external APIs |
| `supabase` | Python Supabase client (service role) |
| `dnspython` | Local MX record lookups |
| `pymupdf` | PDF handling (listed in requirements; WhatsApp pipeline rejects PDF uploads at runtime) |
| `pytest` + `pytest-asyncio` | Tests |
| `langgraph` | **Listed in requirements but not imported anywhere in app code** |

### Database

- **Supabase PostgreSQL** with `vector` extension (1536-dim embeddings)
- **No ORM** on backend — direct Supabase table/RPC calls
- Frontend uses Supabase JS client with RLS

### AI models

| Model | Usage |
|-------|-------|
| Model from `GEMINI_MODEL` (`.env.example`: `gemini-3.1-flash-lite`; config fallback: `gemini-2.0-flash`) | Structured JSON for routing, orchestration, agent synthesis, span annotation, WhatsApp vision OCR |
| `models/gemini-embedding-001` | RAG embeddings (1536 dimensions) |

Gemini structured output: `llm_client._gemini_response_schema()` flattens `anyOf` null-unions so Gemini accepts orchestrator/tool schemas.

### External APIs (agent-service tools)

Google Safe Browsing, VirusTotal, URLhaus, Tavily web search, Google Fact Check Tools, NewsAPI, GDELT, Nominatim (OpenStreetMap), WHOIS JSON API, Meta WhatsApp Graph API v21.0.

### Build and deploy

- Frontend: `npm run build` → `tsc -b && vite build` → static assets; Vercel SPA rewrite
- Backend: Docker image from `Backend/agent-service/Dockerfile`
- **No GitHub Actions workflows** found under `.github/`

---

## 4. Application Architecture

### SafeLine (primary stack)

**Layers:**

1. **Presentation** (`Frontend/src/pages`, `components`) — React UI, no business logic for verdicts
2. **Client services** (`Frontend/src/lib`) — HTTP to agent API, Supabase CRUD
3. **API gateway** (`Backend/agent-service/app/main.py`) — FastAPI routes, CORS
4. **Orchestration** (`chat/orchestrator.py`, `router_agent.py`) — Intent routing and tool selection
5. **Agents** (`agents/scam.py`, `job_offer.py`, `crisis_rumor.py`) — Domain analysis pipelines
6. **Core** (`core/*`) — Schemas, LLM client, guardrails, evidence floor, span annotation
7. **Tools** (`tools/*`) — External evidence fetchers
8. **Persistence** (`db/*`) — Supabase logging
9. **Channel adapters** (`whatsapp/*`) — Meta webhook, formatting, sessions

**Dependency direction:** Pages → hooks/lib → (Supabase | Agent API). Agent API → orchestrator/agents → tools/core → Supabase. Tools never import agents.

**Separation of concerns:** Verdict logic lives entirely in Python. Frontend only renders `AnnotatedVerdict` JSON and persists copies for authenticated users.

---

## 5. Startup Sequence

### Frontend (browser)

1. `index.html` loads `/src/main.tsx`
2. `createRoot` mounts app with providers: `ThemeProvider` → `AuthProvider` → `App`
3. `AuthProvider` calls `supabase.auth.getSession()` and subscribes to `onAuthStateChange`
4. `App` renders `BrowserRouter` with routes inside `AppLayout`
5. `AppLayout` wraps content in `SidebarProvider`, renders `Sidebar`, `Nav`, `Outlet`, conditional `LiveLedgerTicker` on `/`
6. Page components mount; data fetched via `useEffect` + lib functions (no global cache layer)

**Vite dev server:** Reads env from repo root (`vite.config.ts` `envDir: ".."`).

### Backend (agent-service)

1. Uvicorn loads `app.main:app`
2. `get_settings()` loads `.env` from repo root and `Backend/agent-service/.env` (cached via `@lru_cache`)
3. `logging.basicConfig(level=INFO)`
4. `AGENTS` dict registers three agent runners
5. FastAPI app created with CORS middleware (`allow_origins` from `CORS_ORIGINS`)
6. WhatsApp router mounted at `/whatsapp`
7. Routes registered; server listens on `PORT` (default 8000)

**Lazy initialization:** Supabase client created on first `get_supabase()` call. Gemini configured per LLM/embedding request.

**No** explicit database migration runner in backend — migrations applied manually via Supabase.

---

## 6. Frontend (SafeLine SPA)

### Pages and routes (`src/App.tsx`)

| Route | Component | Auth |
|-------|-----------|------|
| `/` | `LandingPage` | Public |
| `/chat` | `ChatPage` | Public |
| `/scam`, `/jobs`, `/crisis` | Redirect to `/chat?hint=*` | — |
| `/about` | `AboutPage` | Public |
| `/sign-in`, `/sign-up` | Auth pages | Public (redirect if signed in) |
| `/forgot-password`, `/reset-password` | Password recovery | Public |
| `/dashboard` | `DashboardPage` | Protected |

**Legacy pages not routed:** `ScamPage.tsx`, `JobsPage.tsx`, `CrisisPage.tsx` (still import `useContentCheck` and direct agent API).

### Layouts

- `AppLayout` — Sidebar + Nav + Footer + outlet; ledger ticker on landing only
- `ProtectedRoute` — Redirects unauthenticated users to `/sign-in` with `state.from`
- `ToolPageLayout` — Used by legacy tool pages

### Key components

**Chat:** `ChatThread`, `ChatComposer`, `ChatMessage`, `ChatSessionList`

**Verdict:** `AnnotatedVerdictCard`, `VerdictReportPanel`, `AnnotatedMessageBlock`, `RiskGauge`, `SourcesCheckedList`, `VerdictSummaryCard`, `ResultPanel`, `CheckingSourcesLoader`

**Marketing:** `HeroLiveDemo`, `WhatsAppMockup`, `StatsStrip`, `RecentChecksStrip`, `ScrollReveal`, `SourceTagRow`

**UI primitives:** `button`, `input`, `textarea`, `label`, `select`, `badge` (shadcn-style)

### Context

| Context | State | Persistence |
|---------|-------|---------------|
| `AuthContext` | `user`, `loading`, auth methods | Supabase session (cookies managed by Supabase client) |
| `ThemeContext` | `default` \| `coffee` theme | `localStorage` key `safeline-theme` |
| `SidebarContext` | pin state, computed width | `localStorage` key `safeline-sidebar-pinned` |

Note: Duplicate `SidebarContext` exists in `components/layout/SidebarContext.tsx` but `AppLayout` uses `contexts/SidebarContext.tsx`.

### Hooks

| Hook | Role |
|------|------|
| `useChatSession` | Chat message state, send flow, Supabase persistence |
| `useContentCheck` | Legacy direct agent check flow |
| `useCountUp`, `useInView`, `usePrefersReducedMotion` | UI animation/a11y |

### Styling

- Tailwind CSS v4 via `@tailwindcss/vite`
- Global styles in `src/index.css`
- Design tokens: classes like `text-ink`, `bg-paper`, `border-line`, `font-display`

### Data fetching

1. **Agent API** — `fetch()` to `VITE_API_BASE_URL` (`chatApi.ts`, `checkContent.ts`, `feedbackApi.ts`)
2. **Supabase** — Direct table queries (`checks.ts`, `chatSessions.ts`, auth)
3. **Mock fallback** — `checkContent.ts` uses `mockVerdicts.ts` when `VITE_API_BASE_URL` unset
4. **Static mock** — `liveLedgerFeed.ts` (comment indicates future Supabase realtime; not implemented)

### Forms and validation

- Auth forms: inline validation in page components; errors from Supabase returned to UI
- Chat: trim empty messages in `useChatSession`
- Dashboard phone linking: plain text input, saved via `updateWhatsAppPhone`

### Error and loading states

- Chat: `loading` boolean disables composer; `error` string displayed
- Protected route: spinner text while `auth.loading`
- API errors: thrown `Error` with message from response `detail` or generic fallback

---

## 7. Backend (agent-service)

### API routes

See Section 18 for full endpoint documentation.

### Controllers

FastAPI route handlers in `main.py` and `whatsapp/meta_webhook.py` — no separate controller layer.

### Services / business logic

- **Orchestrator** (`chat/orchestrator.py`) — Chat decision logic
- **Router** (`router_agent.py`) — Intent classification
- **Agents** — Domain-specific analysis pipelines
- **Agent tools** (`chat/agent_tools.py`) — Thin wrappers mapping tool names to agents
- **WhatsApp pipeline** (`whatsapp/pipeline.py`) — Channel-specific preprocessing and bookkeeping

### Middleware / security deps

- **CORS** — `CORS_ORIGINS` plus built-in origins (`localhost:5173`, production Vercel)
- **`enforce_api_security`** (`app/security/deps.py`) on `/chat/message`, `/agents/*`, `/feedback`: CSRF → optional JWT → rate limit
- **Browser CSRF** (`security/csrf.py`) — when `API_CSRF_ENABLED`, browser POSTs need allowlisted `Origin` + `X-Safeline-Client: web`; paths under `/whatsapp*` are skipped (Meta server-to-server)
- **WhatsApp HMAC** — Optional signature verification via `META_APP_SECRET`

### Authentication / authorization

- **Guest mode by default** (`API_REQUIRE_AUTH=false`). When true, browser/API callers must present a valid Supabase JWT.
- Optional Supabase JWT resolution buckets rate limits (guest IP vs authenticated user).
- Supabase service role used server-side for logging and WhatsApp session writes.
- WhatsApp webhook: Meta verify token on GET; HMAC on POST when secret configured; no browser CSRF.

### Validation

- Pydantic models on all request bodies (`CheckInput`, `ChatMessageRequest`, etc.)
- Agent path param constrained to `AgentType` literal
- Unknown agent → HTTP 404

### Error handling

- Route handlers raise `HTTPException` for known failures
- Agents catch LLM/tool exceptions and fall back to heuristics
- WhatsApp processing wraps errors with user-visible apology message
- Logging via Python `logging` module (INFO default)

### Rate limiting

Implemented in `app/security/rate_limit.py`: per-IP guest and per-user auth buckets when `API_RATE_LIMIT_ENABLED=true`. Uses Upstash Redis when `UPSTASH_REDIS_*` are set; otherwise in-memory.

---

## 8. Database (SafeLine schema)

Source: `Frontend/supabase/fresh_database_setup.sql` and migrations `001`–`010`.

### Tables

| Table | Purpose | Key columns |
|-------|---------|-------------|
| `checks` | User-facing saved checks | `user_id`, `agent`, `input_text`, `verdict` (jsonb) |
| `profiles` | User profile extension | `id` → auth.users, `whatsapp_phone` |
| `agent_runs` | Backend verdict audit log | `channel`, `agent`, `verdict`, `latency_ms`, `user_id` nullable |
| `evidence_log` | Per-run evidence rows | `run_id` FK, `source_name`, `supports_claim` |
| `document_chunks` | RAG vectors | `collection` ('scam_corpus' only), `embedding vector(1536)` |
| `whatsapp_sessions` | WhatsApp state/history | `phone` PK, `chat_history` jsonb, buffer fields |
| `eval_runs` | Eval harness results | `test_case_id`, `expected_status`, `actual_status` |
| `verdict_feedback` | User helpfulness | `run_id` unique FK, `helpful` boolean |
| `chat_sessions` | Web chat sessions | `user_id`, `title`, timestamps |
| `chat_messages` | Web chat messages | `session_id`, `role`, `message_type`, `verdict` jsonb |

### Relationships

```
auth.users ──1:1── profiles
auth.users ──1:N── checks
auth.users ──1:N── chat_sessions ──1:N── chat_messages
agent_runs ──1:N── evidence_log
agent_runs ──1:1── verdict_feedback (unique run_id)
```

### Indexes

- `checks_user_created_idx`, `agent_runs_user_created_idx`
- `chat_sessions_user_updated_idx`, `chat_messages_session_created_idx`
- `document_chunks_embedding_idx` — IVFFlat on embedding
- `verdict_feedback_run_id_idx`

### RLS policies

- Users read/insert own `checks`
- Users manage own `profiles`
- Users read own `agent_runs` and related `evidence_log`
- Public read on `document_chunks` where `collection = 'scam_corpus'`
- Users CRUD own `chat_sessions` / `chat_messages` via session ownership
- `whatsapp_sessions`, `eval_runs`, `verdict_feedback` — RLS enabled; **no insert policies for anon/authenticated** (service role writes)

### RPC functions

`match_document_chunks(query_embedding, match_collection, match_count, match_jurisdiction)` — cosine similarity search; migration `010` fixes implementation.

### Removed features (inferred from schema)

- Migration `006_remove_rental_agent.sql` and `fresh_database_setup.sql` drop references to rental/legal agents and tables (`legal_corpus_coverage`, `stamp_duty_rates`)
- `ingest_legal_corpus()` returns 0 — legal collection not active

---

## 9. Authentication

### Provider

Supabase Auth — email/password only in SafeLine frontend code. **No OAuth providers implemented** in `AuthContext.tsx`.

### Login flow

1. User submits email/password on `/sign-in`
2. `signInWithPassword` via Supabase client
3. Session stored by Supabase client; `onAuthStateChange` updates `AuthContext`
4. Redirect to `location.state.from` or `/dashboard`

### Signup flow

1. `signUp` with `emailRedirectTo: /sign-in`
2. If no immediate session → email confirmation required (`needsEmailConfirmation`)

### Password reset

1. `/forgot-password` → `resetPasswordForEmail` with redirect to `/reset-password`
2. `/reset-password` listens for recovery session → `updateUser({ password })`

### Session mechanism

Supabase JS client manages session tokens internally (not custom JWT handling in app code).

### Protected routes

Only `/dashboard` uses `ProtectedRoute`. `/chat` and landing are fully public.

### Permissions

RLS enforces row-level access on Supabase tables. Backend uses service role key (bypasses RLS) for `agent_runs`, `evidence_log`, `verdict_feedback`, `whatsapp_sessions`.

### WhatsApp account linking

User saves phone on dashboard → `profiles.whatsapp_phone`. Backend `find_user_by_whatsapp` matches normalized variants to attach WhatsApp verdicts to user checks.

---

## 10. AI System

### Overview

The AI system is a **multi-stage evidence-first pipeline** centered on Gemini structured JSON generation. It does not use LangGraph despite the dependency listing.

### Models and providers

- **Provider:** Google Gemini only (`llm_provider: "gemini"`)
- **Client:** `GeminiClient` in `core/llm_client.py`
- **Mode:** `response_mime_type: application/json` with Pydantic `response_schema` derived from model JSON schema (with `$defs` inlined, `default` keys stripped)

### LLM call sites

| Call site | Schema | Purpose |
|-----------|--------|---------|
| `router_agent.classify_intent` | `RouterResult` | Route to scam/job/crisis/general_help |
| `orchestrator.handle_chat_message` | `OrchestratorDecision` | Tool vs reply decision |
| `agent_tools.answer_safety_question` | `SafetyAnswer` | Educational Q&A |
| `run_scam_agent` | `ScamSignals`, `ScamSynthesis` | Extract + synthesize |
| `run_job_agent` | `JobSignals`, `JobSynthesis` | Extract + synthesize |
| `run_crisis_agent` | `CrisisClaim`, `CrisisSynthesis` | Extract + synthesize |
| `annotate_spans` | `SpanPhraseResult` | Phrase extraction for highlighting |
| `vision.extract_text_from_whatsapp_screenshot` | Unstructured text | OCR from images |
| `retriever.embed_text` | Embedding vector | RAG |

### Prompts and guards

`core/prompt_guards.py` injects:

- **Untrusted data rules** — Ignore injection attempts in user content
- **Uncertainty rules** — Force `unverified` status and low confidence on thin input

Separate prompt builders: `extraction_prompt`, `synthesis_prompt`, `analysis_prompt`.

### Schemas and validation

All API and internal verdict shapes defined in `core/schemas.py`. Frontend mirrors in `types/agent.ts`.

Status enums differ by agent:

- **Scam/Job:** `high_risk`, `medium_risk`, `low_risk`, `likely_safe`, `unverified`
- **Crisis:** `confirmed`, `likely_false`, `outdated`, `unverified`

`coerce_verdict_status()` maps LLM string aliases to allowed enums.

### Streaming

**Not implemented.** All LLM calls are async single-response.

### Memory / conversation

- **Web chat:** Client sends `history` array (last 8 turns in orchestrator LLM path); server is stateless except logging
- **WhatsApp:** `whatsapp_sessions.chat_history` persisted in Supabase (max 16 turns); in-memory fallback `_MEM` when Supabase unavailable; inbound Meta message IDs deduped to absorb webhook retries

### Conversation flow (orchestrator)

```
User message
  → educational safety question? (looks_like_safety_question)
        → answer_safety_question — short explanation, no verdict / no history reuse
  → _content_to_check(text, history)
        → reuse prior pasted message only for short follow-ups
        → never for safety questions or thin non-check meta text
  → off-topic check (regex)
  → classify_intent (commands / keywords / LLM)
  → greeting-only → HELP_TEXT
  → forced tool path if content looks checkable
  → else LLM OrchestratorDecision
      → reply (help/clarification/out_of_scope/text)
      → call_tool → execute_tool → agent runner
```

**Fast path:** Skips orchestrator LLM when `_resolve_tool_name` returns a tool (confidence ≥ 0.4 or heuristic URL/scam keywords).

**Why safety Q first:** Short questions like “how does phishing happen” used to pull a previous lottery SMS from session history and re-run a live check. Educational questions now answer in place.

### Tool calling

Not native Gemini function calling. "Tools" are Python functions selected by orchestrator schema fields `tool_name` + `tool_args`.

Registered tools: `check_scam_message`, `check_job_offer`, `check_crisis_rumor`, `answer_safety_question`.

### Embeddings and RAG

- Model: `gemini-embedding-001`, 1536 dimensions
- Storage: `document_chunks` with IVFFlat index
- Retrieval: Supabase RPC `match_document_chunks`
- Ingestion: `rag/ingest_corpus.py` reads `data/scam_reference_corpus.json`
- **Design:** RAG is optional enrichment; `apply_evidence_floor` does not require vector hits
- Fallback: Static FTC evidence item when RPC fails and `fallback=True`

### Retrieval sources by agent

| Agent | Tools |
|-------|-------|
| Scam | Safe Browsing, VirusTotal, URLhaus, Tavily, RAG |
| Job | WHOIS, DNS MX, email domain check, NewsAPI, Tavily, RAG (limit 2) |
| Crisis | Fact Check API, NewsAPI, GDELT, gov site search (Tavily + site filters), Nominatim geocoding |

### Safety mechanisms

1. **Educational Q routing** (`looks_like_safety_question`) — Explains scams without treating the question as a message to check
2. **Input sufficiency** (`input_sufficiency.py`) — Blocks thin/meta-only messages from empty checks
3. **Prompt injection detection** — Flagged in insufficient-input drafts
4. **Scope guardrails** — Regex off-topic blocking
5. **PII stripping** (`guardrails.strip_pii`) — Card numbers, OTP patterns
6. **Evidence floor** — Downgrades overconfident verdicts without evidence
7. **Status coercion** — Prevents invalid LLM status strings
8. **Uncertainty bounds** — Re-caps verdicts when input still insufficient after synthesis
9. **Disclaimers** — Agent-specific; cybercrime.gov.in / 1930 for high-risk scam/job; 112 for disaster urgency in crisis
10. **API hardening** — Browser CSRF Origin allowlist, optional JWT, rate limits

### Evaluation

- Public stubs: `tests/eval_cases/*.jsonl`
- Full fixtures (local): `_private/eval/eval_cases/` (includes `rental_redflag.jsonl`)
- Unit tests: `Backend/agent-service/tests/` (input sufficiency, CSRF, WhatsApp webhook, Gemini schema)
- `eval_runs` table exists for logging eval results
- **Automated eval runner:** Not wired as CI (no `.github/workflows` found)

---

## 11. Request Lifecycle

### Example: Authenticated user sends scam message via web chat

```
1. Browser: User types in ChatComposer, submits
2. useChatSession.sendMessage:
   - Appends user ThreadMessage to local state
   - ensureSession() → createChatSession in Supabase if logged in
   - Builds history from prior messages
3. fetch POST {VITE_API_BASE_URL}/chat/message
   Body: { session_id, text, history }
4. FastAPI chat_message():
   - Assigns session_id if missing
   - Calls handle_chat_message()
5. Orchestrator:
   - classify_intent → likely "scam"
   - _resolve_tool_name → check_scam_message
   - execute_tool → run_scam_agent(CheckInput)
6. Scam agent:
   - is_insufficient_for_check? → early exit if yes
   - analyze_message_patterns (heuristics)
   - Parallel URL checks (Safe Browsing, VT, URLhaus)
   - retrieve_chunks (RAG)
   - LLM ScamSignals extraction
   - Optional web search on scheme_claimed
   - LLM ScamSynthesis
   - enforce_uncertainty_bounds
   - finalize_verdict → PII strip, evidence floor, guardrails, annotate_spans
7. chat_message logs agent_run + evidence_log via service role
8. Returns ChatMessageResponse { type: "verdict", verdict, run_id }
9. Frontend:
   - Appends assistant message with verdict
   - saveChatMessage to Supabase (if user)
   - saveCheck to checks table
10. User opens VerdictReportPanel → AnnotatedVerdictCard renders spans, evidence, feedback via POST /feedback
```

---

## 12. Data Flow

### Inputs

- Plain text (required)
- Optional: URL, email, location (extracted automatically in chat from message text)
- WhatsApp: text, image (OCR), interactive replies; PDF rejected

### Validation

- Pydantic on API boundary
- `is_insufficient_for_check` heuristic gate inside agents
- Frontend: non-empty trim on send

### Transformation

- PII redaction on input text in verdict
- Evidence deduplication by source+snippet prefix
- Status coercion and risk_score computation
- Span phrase → character offset mapping in Python (not LLM offsets)

### Storage

| Data | Where |
|------|-------|
| Verdict JSON | `agent_runs.verdict`, `checks.verdict`, `chat_messages.verdict` |
| Evidence rows | `evidence_log` |
| Chat history | `chat_messages` (web), `whatsapp_sessions.chat_history` (WhatsApp) |
| Embeddings | `document_chunks` |
| Feedback | `verdict_feedback` |

### Caching

- `@lru_cache` on `get_settings()` and `get_supabase()`
- No HTTP cache headers on agent API

---

## 13. Configuration

### Frontend

| File | Purpose |
|------|---------|
| `Frontend/package.json` | Dependencies and scripts |
| `Frontend/vite.config.ts` | Vite plugins, `@/` alias, env dir = repo root |
| `Frontend/tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json` | TypeScript project references |
| `Frontend/vercel.json` | SPA rewrite: all non-`/api/*` → `index.html` |
| `Frontend/index.html` | Vite entry HTML |

### Backend

| File | Purpose |
|------|---------|
| `Backend/agent-service/requirements.txt` | Python dependencies |
| `Backend/agent-service/Dockerfile` | Python 3.11-slim, MuPDF deps, uvicorn CMD |
| `Backend/agent-service/app/config.py` | Pydantic settings |

### Backend-tooling

| File | Purpose |
|------|---------|
| `Backend-tooling/pytest.ini` | Pytest configuration |
| `Backend-tooling/_paths.py` | Import path bootstrap for scripts |

### Supabase

- SafeLine: `Frontend/supabase/migrations/*.sql`, `fresh_database_setup.sql`
- Archived app schemas (if present): `_archive/` only

---

## 14. Environment Variables

### SafeLine Frontend (Vite — loaded from repo root)

| Variable | Required | Used in | Impact if missing |
|----------|----------|---------|-------------------|
| `VITE_SUPABASE_URL` | **Yes** | `lib/supabase.ts` | Throws at module load |
| `VITE_SUPABASE_ANON_KEY` | **Yes** | `lib/supabase.ts` | Throws at module load |
| `VITE_API_BASE_URL` | Optional | `chatApi.ts`, `checkContent.ts`, `feedbackApi.ts` | Chat throws error; direct checks use mock data; feedback no-ops |
| `VITE_WHATSAPP_NUMBER` | Optional | `WhatsAppMockup.tsx` | Defaults to `15551709431` |
| `VITE_WHATSAPP_NUMBER_DISPLAY` | Optional | `WhatsAppMockup.tsx` | Default display string |

### Vercel serverless (`Frontend/api/whatsapp/send.ts`)

| Variable | Required | Purpose |
|----------|----------|---------|
| `WHATSAPP_RELAY_SECRET` | Yes | Validates `X-Relay-Secret` header |
| `META_WHATSAPP_TOKEN` | Yes | Meta Graph API bearer token |
| `META_PHONE_NUMBER_ID` | Yes | WhatsApp sender phone number ID |

### Backend agent-service (`app/config.py`)

| Variable | Default | Required for | Impact if missing |
|----------|---------|--------------|-------------------|
| `LLM_PROVIDER` | `gemini` | LLM | Only `gemini` supported |
| `GEMINI_API_KEY` | `""` | LLM, RAG, vision | LLM calls fail; warnings logged |
| `GEMINI_MODEL` | `gemini-2.0-flash` | Generation | `.env.example` recommends `gemini-3.1-flash-lite` |
| `SUPABASE_URL` or `VITE_SUPABASE_URL` | `""` | DB logging, RAG, sessions | Operations skipped with warnings |
| `SUPABASE_SERVICE_ROLE_KEY` | `""` | DB | `get_supabase()` returns None |
| `CORS_ORIGINS` | `http://localhost:5173` | Browser access | Merged with `BUILTIN_WEB_ORIGINS` (includes production Vercel) |
| `PORT` | `8000` | Server bind | — |
| `API_REQUIRE_AUTH` | `false` | Guest vs JWT-required API | Guests allowed when false |
| `API_CSRF_ENABLED` | `true` | Browser POST Origin+header check | Disable only for local experiments |
| `API_RATE_LIMIT_ENABLED` | `true` | Per-hour guest/auth buckets | — |
| `API_RATE_LIMIT_GUEST_PER_HOUR` | `20` | Guest IP limit | — |
| `API_RATE_LIMIT_AUTH_PER_HOUR` | `120` | Authenticated user limit | — |
| `GOOGLE_SAFE_BROWSING_KEY` | `""` | URL checks | Tool returns None |
| `VIRUSTOTAL_API_KEY` | `""` | URL checks | Tool returns None |
| `PHISHTANK_API_KEY` | `""` | — | **Unused** (PhishTank stub) |
| `GOOGLE_FACT_CHECK_KEY` | `""` | Crisis agent | Tool returns empty |
| `NEWSAPI_KEY` | `""` | Crisis/job agents | Tool returns empty |
| `TAVILY_API_KEY` | `""` | Web/gov search | Tool returns empty |
| `META_WHATSAPP_TOKEN` | `""` | WhatsApp send | Outbound messages skipped |
| `META_PHONE_NUMBER_ID` | `""` | WhatsApp send | Outbound messages skipped |
| `META_VERIFY_TOKEN` | `safeline-verify-token` | Webhook GET verify | Must match Meta config |
| `META_APP_SECRET` | `""` | Webhook POST HMAC | Verification skipped if empty |
| `WHATSAPP_SEND_RELAY_URL` | `""` | HF Spaces outbound | Direct Graph API attempted |
| `WHATSAPP_RELAY_SECRET` | `""` | Relay auth | — |
| `UPSTASH_REDIS_URL` | `""` | Optional distributed rate limit | Falls back to in-memory |
| `UPSTASH_REDIS_TOKEN` | `""` | Optional distributed rate limit | Falls back to in-memory |

Runtime-detected (not in Settings):

| Variable | Purpose |
|----------|---------|
| `SPACE_ID` | Detected HF Spaces environment; triggers curl/urllib/relay fallbacks |

---

## 15. External Services

| Service | Used by | Integration |
|---------|---------|-------------|
| **Supabase** | Frontend, Backend | Auth, PostgreSQL, pgvector RPC, RLS |
| **Google Gemini** | Backend | LLM + embeddings |
| **Google Safe Browsing API** | Scam agent | URL threat matches |
| **VirusTotal API** | Scam agent | Domain reputation |
| **URLhaus (abuse.ch)** | Scam agent | Malware URL feed (no key) |
| **Tavily API** | Scam, job, gov search | Web search |
| **Google Fact Check Tools API** | Crisis agent | Claim search |
| **NewsAPI** | Crisis, job agents | News articles |
| **GDELT Project API** | Crisis agent | Global event database (no key) |
| **Nominatim (OSM)** | Crisis agent | Geocoding (no key) |
| **WHOIS JSON API** | Job agent | Domain registration info |
| **Meta WhatsApp Cloud API** | WhatsApp channel | Webhook + outbound messages |
| **Vercel** | Frontend hosting | Static SPA + serverless relay |
| **Hugging Face Spaces** | Backend hosting | Docker Space (`celestiallord-safe-line`); Meta TLS via Vercel relay |
| **Upstash Redis** | Agent rate limiting (optional) | Used when `UPSTASH_REDIS_*` set |

**Live URLs:** frontend [safe-line-khaki.vercel.app](https://safe-line-khaki.vercel.app); agent API [celestiallord-safe-line.hf.space](https://celestiallord-safe-line.hf.space).

**Not used despite code references:** PhishTank (stub), LangGraph dependency.

---

## 16. Folder-by-Folder Breakdown

### Repository root

| Path | Purpose |
|------|---------|
| `.env.example` | Template for frontend + backend env |
| `.vercel/` | Vercel project linkage |
| `data/` | `scam_reference_corpus.json`, sample CSV, corpus builder input |
| `docs/` | Public documentation |
| `tests/eval_cases/` | Public eval JSONL stubs |
| `_private/` | Local-only full eval + internal docs |
| `_archive/` | Local-only archived apps / old test trees |

### `Frontend/`

| Path | Purpose |
|------|---------|
| `api/whatsapp/` | Vercel serverless WhatsApp relay |
| `src/App.tsx` | Routes (`/chat` primary; `/scam|jobs|crisis` redirect) |
| `src/pages/` | Landing, chat, dashboard, auth, about |
| `src/components/` | Verdict card, chat, `HeroLiveDemo`, layout |
| `src/lib/` | `apiFetch` (CSRF header), chat/check APIs, Supabase |
| `supabase/migrations/` | Incremental SQL migrations |

### `Backend/agent-service/`

| Path | Purpose |
|------|---------|
| `app/main.py` | FastAPI entry, core routes |
| `app/config.py` | Settings + builtin web origins |
| `app/security/` | CSRF, JWT auth, rate limit, shared deps |
| `app/router_agent.py` | Intent classification |
| `app/agents/` | Scam, job, crisis agents + heuristics + base |
| `app/chat/` | Orchestrator, tools, scope guardrails |
| `app/core/` | Schemas, LLM, guardrails, evidence, spans, input checks |
| `app/tools/` | External evidence integrations |
| `app/rag/` | Retriever + offline ingest (reads `data/`) |
| `app/whatsapp/` | Meta webhook (dedup), pipeline, session, vision, formatter, **interactive menus** |
| `app/db/` | Supabase client, feedback |
| `tests/` | Unit tests (CSRF, WhatsApp, input sufficiency, Gemini schema) |

### `Backend-tooling/`

| Path | Purpose |
|------|---------|
| `scripts/seed_corpus.py` | Runs corpus ingest via agent-service modules |
| `scripts/convert_data_txt_corpus.py` | Converts `data/` builder input → corpus JSON |
| `_paths.py` | Import path bootstrap |

### Eval locations

| Path | Purpose |
|------|---------|
| `tests/eval_cases/` | Public JSONL stubs (scam / job / crisis) |
| `_private/eval/eval_cases/` | Full local fixtures (incl. rental_redflag) |

---

## 17. File-by-File Breakdown (Important Files)

### Backend — entry and routing

| File | Exports / responsibilities | Depends on | Called by |
|------|---------------------------|------------|-----------|
| `main.py` | FastAPI app, `/health`, `/agents/route`, `/chat/message`, `/agents/{agent}`, `/feedback` | agents, orchestrator, db, schemas, `security.deps` | Uvicorn |
| `config.py` | `Settings`, `get_settings()`, `BUILTIN_WEB_ORIGINS`, `is_allowed_browser_origin` | pydantic-settings | All modules needing config |
| `security/csrf.py` | `enforce_browser_csrf` (WhatsApp bypass) | config | `security/deps` |
| `security/rate_limit.py` | Guest/auth rate buckets (Upstash or memory) | config | `security/deps` |
| `security/deps.py` | `enforce_api_security` | csrf, auth, rate_limit | Protected routes |
| `router_agent.py` | `classify_intent()` | llm_client, input_sufficiency | orchestrator, `/agents/route` |

### Backend — agents

| File | Role |
|------|------|
| `agents/base.py` | `finalize_verdict`, `insufficient_input_draft`, `enforce_uncertainty_bounds` |
| `agents/scam.py` | `run_scam_agent` — full scam pipeline |
| `agents/job_offer.py` | `run_job_agent` |
| `agents/crisis_rumor.py` | `run_crisis_agent` |
| `agents/scam_heuristics.py` | `analyze_message_patterns`, red flag templates, evidence filtering |
| `agents/crisis_heuristics.py` | Crisis pattern detection |

### Backend — chat

| File | Role |
|------|------|
| `chat/orchestrator.py` | `handle_chat_message` — main conversational logic |
| `chat/agent_tools.py` | `execute_tool`, agent wrappers, `answer_safety_question` |
| `chat/scope_guardrails.py` | `is_off_topic`, `OFF_SCOPE_REPLY` |

### Backend — core

| File | Role |
|------|------|
| `core/schemas.py` | All Pydantic models and type literals |
| `core/llm_client.py` | `GeminiClient.structured_json` |
| `core/guardrails.py` | PII strip, disclaimers, action rewriting |
| `core/evidence_engine.py` | `apply_evidence_floor`, `risk_score_from_status` |
| `core/input_sufficiency.py` | Thin-input, check-request heuristics, `looks_like_safety_question` |
| `core/status_coercion.py` | LLM status → enum mapping |
| `core/prompt_guards.py` | System prompt safety prefixes |
| `core/span_annotator.py` | LLM phrase pick + Python offset locate |

### Backend — tools (each exports async check functions → `EvidenceItem`)

`safe_browsing.py`, `virustotal.py`, `urlhaus.py`, `phishtank.py` (no-op), `web_search.py`, `fact_check.py`, `news_api.py`, `gdelt.py`, `gov_search.py`, `nominatim.py`, `whois.py`, `dns_mx.py`, `email_domain.py`, `url_extract.py`

### Backend — WhatsApp

| File | Role |
|------|------|
| `whatsapp/meta_webhook.py` | Routes, signature verify, message-id dedup, media download (relay on HF), background tasks; `MetaMessenger.send_text` / `send_interactive` |
| `whatsapp/pipeline.py` | `handle_inbound` — menu ids, OCR, RESET/HELP, channel adapter to orchestrator; post-verdict buttons |
| `whatsapp/interactive.py` | List menu + reply-button builders (`check_scam` / `check_job` / `check_crisis` / Reset) |
| `whatsapp/session.py` | Supabase/in-memory session CRUD |
| `whatsapp/formatter.py` | WhatsApp-specific text formatting |
| `whatsapp/classifier.py` | `is_chitchat` greeting detection |
| `whatsapp/vision.py` | Gemini screenshot OCR (`extract_text_from_screenshot`) |

### Backend — data

| File | Role |
|------|------|
| `db/supabase_client.py` | Client singleton, `log_agent_run`, `save_check_for_user`, `find_user_by_whatsapp` |
| `db/feedback.py` | `submit_verdict_feedback` upsert |
| `rag/retriever.py` | Embed + vector search |
| `rag/ingest_corpus.py` | Offline corpus seeding |

### Frontend — key files

| File | Role |
|------|------|
| `App.tsx` | Routes |
| `hooks/useChatSession.ts` | Chat state machine |
| `lib/chatApi.ts` / `apiFetch` | POST `/chat/message` with `X-Safeline-Client: web` |
| `lib/checkContent.ts` | POST `/agents/{agent}` when `VITE_API_BASE_URL` set; mock fallback otherwise |
| `components/HeroLiveDemo.tsx` | Landing typewriter demo; reserved-height overlay avoids layout flicker |
| `lib/chatSessions.ts` | Supabase chat CRUD + localStorage session ID |
| `lib/checks.ts` | User check history and profile |
| `lib/feedbackApi.ts` | POST `/feedback` |
| `lib/verdictFormat.ts`, `riskSemantics.ts` | Display helpers |
| `components/AnnotatedVerdictCard.tsx` | Primary verdict UI |
| `components/verdict/VerdictReportPanel.tsx` | Slide-over report + feedback |
| `contexts/AuthContext.tsx` | Supabase auth wrapper |
| `api/whatsapp/send.ts` | Vercel relay: `send` (text), `send_message` (interactive), `download_media` |
| `lib/chatIntent.ts` | `looksLikeLiveCheck` → pending reply vs check UI |
| `lib/chatImage.ts` | Screenshot resize → base64 for `/chat/message` |
| `components/chat/ChatReplyPending.tsx` | Lightweight “Replying…” bubble |

---

## 18. API Documentation

### SafeLine Agent Service (FastAPI)

Base URL: `VITE_API_BASE_URL` — local `http://localhost:8000` or production `https://celestiallord-safe-line.hf.space`

**Browser POSTs** (chat/agents/feedback): Origin allowlist + `X-Safeline-Client: web`. **`/whatsapp/*`** skips CSRF (Meta/HMAC + relay secret).

#### `GET /health`

- **Auth:** None
- **Response:** `{ "status": "ok", "service": "safeline-agent-service" }`

#### `POST /agents/route`

- **Auth / CSRF / rate limit:** via `enforce_api_security` (guest allowed by default)
- **Input:** `CheckInput` — `{ text, url?, email?, location?, jurisdiction?, fileName? }`
- **Output:** `RouterResult` — `{ intent, confidence, clarifying_question? }`
- **Errors:** `422` if `confidence < 0.6` and clarifying question set; `403` CSRF/origin; `429` rate limit

#### `POST /chat/message`

- **Auth / CSRF / rate limit:** via `enforce_api_security`
- **Input:** `ChatMessageRequest` — `{ session_id?, text, history[] }`
- **Output:** `ChatMessageResponse` — `{ type, session_id, tool_used?, assistant_text, verdict?, run_id? }`
- **Side effects:** Logs `agent_runs` when `type === "verdict"`
- **Empty text:** Returns clarification without calling orchestrator
- **Educational questions:** Orchestrator routes to `answer_safety_question` (no history re-check)

#### `POST /agents/{agent}`

- **Auth / CSRF / rate limit:** via `enforce_api_security`
- **Path param:** `agent` ∈ `scam` | `job_offer` | `crisis_rumor`
- **Input:** `CheckInput`
- **Output:** `AgentCheckResponse` — `{ verdict: AnnotatedVerdict, run_id? }`
- **Errors:** `404` unknown agent

#### `POST /feedback`

- **Auth / CSRF / rate limit:** via `enforce_api_security`
- **Input:** `{ run_id: string, helpful: boolean }`
- **Output:** `{ status: "ok" }`
- **Errors:** `400` if save fails

#### `GET /whatsapp/webhook`

- **Query:** `hub.mode`, `hub.verify_token`, `hub.challenge`
- **Output:** Plain text challenge on success
- **Errors:** `403` verification failed

#### `POST /whatsapp/webhook`

- **Headers:** `X-Hub-Signature-256` (required if `META_APP_SECRET` set)
- **Input:** Meta webhook JSON payload
- **Output:** `{ status: "ok" }` (processing async)
- **Dedup:** In-memory `_processed_message_ids` skips Meta retries for the same `messages[].id`
- **Errors:** `403` invalid signature

#### `GET /whatsapp/status`

- **Output:** Diagnostic object (credential flags, last webhook/send error, relay config); production expects `ready` + `relay_configured`

#### `GET /whatsapp/probe`

- **Output:** Outbound connectivity test results to `graph.facebook.com`

### SafeLine Frontend (Vercel)

#### `POST /api/whatsapp/send`

- **Auth:** Header `X-Relay-Secret` must match `WHATSAPP_RELAY_SECRET`
- **Input:** `{ to: string, body: string }`
- **Output:** Meta Graph API response passthrough
- **Errors:** 401, 400, 405, 500

### Supabase (client-side, not REST routes defined in repo)

Operations documented in Section 8 — accessed via `@supabase/supabase-js`.

---

## 19. Component Relationships

### SafeLine component tree (simplified)

```
AppLayout
├── Sidebar
├── Nav (ThemeToggle, auth links)
├── Outlet
│   ├── LandingPage (HeroLiveDemo, WhatsAppMockup, StatsStrip, ...)
│   ├── ChatPage
│   │   ├── ChatSessionList (authenticated only)
│   │   ├── ChatThread
│   │   │   └── ChatMessage → AnnotatedVerdictCard (on verdict)
│   │   ├── ChatComposer
│   │   └── VerdictReportPanel → RiskGauge, SourcesCheckedList, feedback
│   ├── DashboardPage (checks list, WhatsApp phone form)
│   └── Auth pages / AboutPage
├── LiveLedgerTicker (pathname === "/")
└── Footer
```

### Data dependencies

- `ChatPage` → `useChatSession` → `chatApi` + `chatSessions` + `checks`
- `AnnotatedVerdictCard` → `verdictFormat`, `riskSemantics`, `AnnotatedMessageBlock`
- `VerdictReportPanel` → `feedbackApi`
- `DashboardPage` → `checks.ts` + `AuthContext`
- Legacy `ScamPage`/`JobsPage`/`CrisisPage` → `useContentCheck` → `checkContent.ts`

---

## 20. Dependency Graph

### Central modules (high fan-in)

- `core/schemas.py` — imported by virtually all backend modules
- `config.get_settings()` — all tools, LLM, db
- `agents/base.finalize_verdict` — all three agents
- `chat/orchestrator.handle_chat_message` — web chat + WhatsApp

### Leaf modules

- Individual `tools/*.py` files — only called by agents
- `Frontend/src/data/mockVerdicts.ts` — only `checkContent.ts`
- `Frontend/hooks/useCountUp.ts` — presentation only

### Cross-boundary

```
Frontend/lib/chatApi.ts  ──HTTP──►  Backend/main.py
Frontend/lib/supabase.ts ──SDK───►  Supabase
Backend/db/supabase_client.py ──SDK───► Supabase
Backend/tools/*.py ──HTTP──► External APIs
```

**No import relationship** between `Frontend/` and `Backend/` at build time — runtime HTTP only.

---

## 21. Important Algorithms

### Intent classification (`router_agent.py`)

1. Command prefix: `SCAM`, `JOB`, `CRISIS` → confidence 0.95
2. Insufficient input + check-request hint → scam @ 0.55 with clarifying question
3. Keyword regex per intent → confidence 0.75
4. Else Gemini `RouterResult` with confidence threshold 0.6

### Input sufficiency (`input_sufficiency.py`)

Combines length checks, substance regex (URLs, money, scam keywords), meta-noise stripping, and injection-without-substance detection.

`looks_like_safety_question()` — educational phrasing (`how/what/why/explain`) without a URL or long scam substance → route to Q&A, not a check. `looks_like_check_request()` no longer treats the substring `phish` inside `phishing` as an automatic check.

### Scam heuristics (`scam_heuristics.py`)

Pattern tags: prize, bank, parcel, loan fee, creator impersonation, YouTube subscribe scams. Produces `ScamPatternProfile` with pre-built evidence items and status/confidence before LLM.

### Crisis evidence status (`crisis_rumor._status_from_evidence`)

- ≥2 contradicting sources → `likely_false`
- ≥2 supporting, 0 contradicting → `confirmed`
- Mislocalization snippet → `outdated`
- Else → `unverified`

### Evidence floor (`evidence_engine.apply_evidence_floor`)

If no evidence: allow heuristic/LLM analysis for scam/job with capped confidence (0.78); else force `unverified` @ 0.35. Never blocks verdict solely due to empty vector index.

### Risk score (`risk_score_from_status`)

Base score per status (e.g. high_risk=85) adjusted by `(1-confidence)*15`, clamped 0–100.

### Span annotation (`span_annotator.py`)

1. LLM returns verbatim phrases + tag indices + severities
2. Python locates phrases in input (case-insensitive fallback)
3. Quality filter rejects generic phrases
4. Dedupe overlapping spans

### Orchestrator fast path + history selection

1. Safety questions → `answer_safety_question` immediately.
2. `_content_to_check` may reuse prior user text for short follow-ups (<40 chars), but **not** for safety questions or thin non-check text.
3. `_looks_like_content_to_check` uses length, URL presence, keyword regex; combined with router confidence ≥ 0.4 bypasses the orchestrator LLM.

### WhatsApp phone normalization

Strip non-digits; prepend `91` for 10-digit Indian numbers.

---

## 22. Error Handling

### Global

- Backend: uncaught exceptions in WhatsApp background tasks logged + user apology sent
- Frontend: try/catch in hooks with user-visible error strings

### API

- FastAPI `HTTPException` for 404/422/400/403
- Agent tools: catch → `ChatMessageResponse type="error"`

### Validation

- Pydantic automatic 422 on malformed bodies (FastAPI default)
- Insufficient input → structured `unverified` verdict (not HTTP error)

### Retries

- WhatsApp outbound: 3 attempts with exponential backoff
- LLM: no automatic retry; falls back to heuristics

### Fallbacks

| Failure | Fallback |
|---------|----------|
| LLM synthesis | Heuristic draft from pattern profile |
| LLM orchestrator | Forced tool or clarifying question |
| Missing API keys | Tool returns None/[] |
| Missing Supabase | Skip logging; in-memory WhatsApp sessions |
| Missing VITE_API_BASE_URL | Mock verdicts (1.5s delay) |
| Span LLM failure | Empty flagged_spans |

---

## 23. Security

### Implemented

- Supabase RLS on user tables
- Optional Supabase JWT on agent API (`API_REQUIRE_AUTH`; guest mode default)
- Browser CSRF: Origin allowlist (`BUILTIN_WEB_ORIGINS` + `CORS_ORIGINS` + Vercel preview pattern) + `X-Safeline-Client: web`
- Explicit CSRF bypass for `/whatsapp*` (Meta HMAC / relay auth instead)
- Per-IP / per-user rate limiting (Upstash or in-memory)
- WhatsApp webhook HMAC (`META_APP_SECRET`) + inbound message-id dedup
- Relay secret on Vercel WhatsApp function (`X-Relay-Secret`)
- PII redaction in verdicts
- Prompt injection detection (analysis ignored, flagged)
- Off-topic scope blocking + educational-question routing (no silent history re-check)
- Service role key server-side only (not in frontend bundle)

### Not implemented / gaps

- Content Security Policy headers in frontend source (not confirmed)
- Turnstile / bot protection on the public web chat
- Full Meta Business verification for WhatsApp beyond test numbers

### Secret handling

- Frontend only receives `VITE_*` public keys
- `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, Meta tokens backend/Vercel only

---

## 24. Performance

### Implemented

- Parallel `asyncio.gather` for URL checks and crisis evidence
- `@lru_cache` for settings and Supabase client
- httpx connection pooling for Meta client
- WhatsApp webhook returns immediately; processing in background tasks
- Evidence dedup and cap (5 items via `normalize_evidence`)
- IVFFlat vector index on embeddings
- Vite production bundle splitting (default Rollup behavior)
- Sidebar width CSS transition; no heavy animation libraries in SafeLine frontend

### Not implemented

- Response streaming
- React Query caching
- CDN configuration in repo (relies on Vercel defaults)
- Redis caching in Python backend

---

## 25. Build & Deployment

### SafeLine Frontend

```bash
cd Frontend && npm run build  # tsc -b && vite build
```

- Output: `Frontend/dist/`
- Deploy: Vercel with SPA rewrite (`vercel.json`)
- Serverless: `api/whatsapp/send.ts` deployed as Node function

### Backend

```bash
docker build -t safeline-agent Backend/agent-service
docker run -p 8000:8000 --env-file .env safeline-agent
```

- Base: `python:3.11-slim`
- CMD: `uvicorn app.main:app --host 0.0.0.0 --port 8000`

### Environment separation

- Local: `localhost:5173` + `VITE_API_BASE_URL=http://localhost:8000`
- Production: Vercel SPA + relay at `https://safe-line-khaki.vercel.app`; agent on HF Spaces `https://celestiallord-safe-line.hf.space`
- Capstone submission repo prepared via `scripts/prepare-capstone-push.sh` (strips HF README frontmatter, excludes `_private/` / `_archive/`)

### Database migrations

Manual application via Supabase SQL editor or CLI — no automated migration runner in deploy pipeline found.

---

## 26. Known Limitations (inferred from implementation)

1. **Guest API default** — open to abuse of LLM/tool quota unless rate limits / `API_REQUIRE_AUTH` tightened
2. **`langgraph` dependency unused**
3. **PhishTank integration is a no-op stub**
4. **PDF WhatsApp uploads rejected** despite `pymupdf` in requirements
5. **Rental/legal agent removed** — private eval still has `rental_redflag.jsonl`
6. **`ingest_legal_corpus()` always returns 0**
7. **Live ledger ticker uses static mock data**, not Supabase
8. **Legacy tool pages** redirect to `/chat?hint=…`
9. **Guest chat sessions** not persisted to Supabase (localStorage ID only)
10. **Gemini required** — no fallback LLM provider despite `LLM_PROVIDER` setting
11. **No CI/CD workflows** found in repository
12. **In-memory WhatsApp message-id dedup** resets on process restart (acceptable for Meta short retries)
13. **Meta Business verification** still required for production WhatsApp reach beyond test numbers

---

## 27. Future Extension Points

| Extension point | Location | Pattern |
|-----------------|----------|---------|
| New agent type | `agents/`, `main.AGENTS`, schemas `AgentType`, DB check constraints | Registry dict |
| New chat tool | `chat/agent_tools.TOOL_RUNNERS`, orchestrator prompts | Tool runner map |
| New external evidence source | `tools/new_tool.py`, call from agent gather functions | Async function → EvidenceItem |
| New RAG collection | `document_chunks.collection` check constraint, `ingest_corpus.py` | Collection string + ingest script |
| LLM provider swap | `core/llm_client.get_llm_client()` | Abstract `LLMClient` base class |
| Legal corpus | `ingest_legal_corpus()` stub | Reserved function |
| WhatsApp media types | `meta_webhook.receive_webhook` message type handling | Branch per `msg_type` |
| Frontend auth providers | `AuthContext.tsx` | Add Supabase OAuth methods |
| Status coercion aliases | `status_coercion._ALIASES` | Dict per agent |
| Heuristic patterns | `scam_heuristics.py`, `crisis_heuristics.py` | Regex + profile dataclass |
| Persistent webhook dedup | `meta_webhook.py` | Replace in-memory set with Redis/DB |

---

## 28. Complete Architecture Narrative

SafeLine is a capstone-grade trust-and-safety product aimed at Indian users who receive suspicious digital communications. The production user journey centers on a Vite-powered React single-page application deployed on Vercel. Users land on a marketing homepage, navigate to a unified chat interface at `/chat`, and paste suspicious SMS text, job offer emails, or forwarded disaster rumors. The browser sends the message — along with optional conversation history — to a Python FastAPI service that hosts the actual intelligence.

That backend service exposes a small REST surface hardened with browser CSRF, optional JWT auth, and rate limits (guest mode on by default). The primary endpoint for the web UI is `POST /chat/message`, which feeds into a conversational orchestrator. Educational safety questions (“how does phishing happen”) are answered first via `answer_safety_question` so short Q&A never reuses an older pasted message from session history. Otherwise the orchestrator resolves check content (`_content_to_check`), rejects obviously off-topic requests, then classifies intent through a layered router: explicit commands (`SCAM`, `JOB`, `CRISIS`), keyword heuristics, or a Gemini structured-classification call. When the user's message contains enough substantive content, the system takes a fast path into one of three specialized agents; otherwise a Gemini orchestrator decides whether to invoke a checking tool or reply with help/clarification.

Each agent implements the same philosophical pattern: **gather live evidence first, then synthesize a verdict with an LLM grounded in that evidence, then apply deterministic safety post-processing.** The scam agent extracts URLs and runs them against Google Safe Browsing, VirusTotal, and URLhaus in parallel. It matches message patterns against an extensive heuristic library covering prize scams, bank KYC phishing, parcel fees, loan disbursal traps, and creator impersonation. It optionally retrieves similar advisory text from a pgvector index populated from a JSON corpus. The job agent inspects email domains for free-mail usage, MX records, WHOIS data, and searches news and web sources for registration-fee scam patterns. The crisis agent extracts structured claims, geocodes locations to detect mislocalized rumors, and queries fact-check APIs, news, GDELT, and Indian government site search concurrently.

Every agent uses Gemini twice when possible: once to extract structured signals from the message, once to synthesize a verdict JSON containing status, confidence, red flags, explanation, recommended actions, and a family-friendly rewrite. If Gemini fails, heuristic profiles provide fallback drafts. Before returning, all agents pass through `finalize_verdict`, which strips payment card and OTP-like PII from displayed input, applies an evidence floor so empty RAG results do not falsely imply total ignorance, injects legally appropriate disclaimers and Indian helpline references, and optionally annotates suspicious phrases by having Gemini name verbatim substrings that Python then locates by character offset.

The frontend renders the resulting `AnnotatedVerdict` as an interactive card with risk gauge, superscript-linked red flags, evidence source list, and a slide-over report panel. Authenticated users persist checks and chat history in Supabase under row-level security policies. When a verdict is produced on the web, the backend logs an `agent_run` row and associated `evidence_log` entries using a service-role Supabase client, returning a `run_id` the UI can attach feedback to.

Parallel to the web channel, a WhatsApp integration listens on `/whatsapp/webhook` for Meta Cloud API events (CSRF-exempt; HMAC-verified). Incoming text, images (Gemini vision OCR), and interactive list/button replies are handled in `pipeline.handle_inbound`: greetings and `MENU`/`HELP` send HELP text plus a selectable **Choose** list (scam / job / crisis / how it works / reset); check-row taps prompt the user to paste or send a screenshot; Reset clears history so a new paste is not mixed with old messages. Content checks still call the same `handle_chat_message` orchestrator, then format a WhatsApp verdict and optionally attach **Open menu** / **Reset chat** reply buttons. Meta retries are absorbed via inbound message-id deduplication. Outbound text, interactive menus, and media downloads go through a Vercel serverless relay (`Frontend/api/whatsapp/send.ts`) when the agent runs on Hugging Face Spaces. WhatsApp conversation state lives in `whatsapp_sessions`; users who link their phone on the dashboard can have WhatsApp verdicts mirrored into `checks`.

Data infrastructure relies on Supabase for authentication (email/password), PostgreSQL storage, and vector search. Migrations in `Frontend/supabase/migrations` evolved from an earlier four-agent design to the current three-agent model. RAG ingestion is offline via `Backend-tooling/scripts/seed_corpus.py`, reading `data/scam_reference_corpus.json`, embedding with Gemini, and inserting into `document_chunks`.

Public eval stubs live in `tests/eval_cases/`; fuller fixtures stay under `_private/eval/`. Live-verified demo paste texts: `tests/eval_cases/ (see also private DEMO_MESSAGES)`. Overall, SafeLine prioritizes **evidence-grounded verdicts with graceful degradation**: missing API keys, empty vector indexes, or LLM failures degrade to heuristics and `unverified` statuses rather than hallucinated certainty.

---

*Last synced July 2026 — safety-question routing, pending reply-vs-check UI, web+WhatsApp screenshot OCR, interactive WhatsApp menus, HF↔Vercel relay (`send` / `send_message` / `download_media`). Statements not directly observable in code are marked "could not be confirmed" above.*
