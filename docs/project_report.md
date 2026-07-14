# SafeLine Project Report

**Team AURA** — Himshikhar 2026 Agentic AI Capstone

| Name | Roll No. |
|---|---|
| Rithik Vimal Sumbly | 216 |
| Suave Krishan Doda | 234 |
| Kushagra Mathur | 136 |
| Ruthwin Venkatesh | 184 |
| Tushika Gupta | 166 |

| | Link |
|---|---|
| Live app | [safe-line-khaki.vercel.app](https://safe-line-khaki.vercel.app) |
| Agent API | [celestiallord-safe-line.hf.space](https://celestiallord-safe-line.hf.space) |

## Problem

SafeLine helps users verify suspicious messages, job offers, and crisis rumors before they act. Every verdict is grounded in named external sources — not LLM guesses alone.

## Reference data

- **Primary corpus:** [`data/scam_reference_corpus.json`](../data/scam_reference_corpus.json) — RBI/NPCI/FTC-style advisories, embedded with `gemini-embedding-001` into Supabase pgvector
- **External:** [FTC job scams guidance](https://consumer.ftc.gov/articles/job-scams)
- **Supplementary:** [`data/sample_scam_messages.csv`](../data/sample_scam_messages.csv)

## Architecture

- **Frontend:** Vite + React 19 + TypeScript + Tailwind v4 + React Router 7 (Vercel)
- **Backend:** FastAPI + Pydantic + Gemini agent pipelines (HF Spaces / Docker)
- **Database:** Supabase Postgres + Auth + RLS + pgvector
- **WhatsApp:** Meta Cloud API webhook → same orchestrator; Vercel relay for text, interactive menus, and media download on HF
- **Not LangGraph:** `langgraph` is listed in Python requirements but unused; routing is a custom async orchestrator, not a graph runtime

**Orchestrator:** educational safety questions → answer in place; otherwise classify / fast-path agent / LLM tool decision. Short follow-ups may reuse prior pasted content; safety questions never do.

**Channels also accept screenshots** (web paste + WhatsApp photo) → Gemini Vision OCR → same check path.

## Agent logic summary

| Agent | Key tools | Output |
|-------|-----------|--------|
| Scam | Safe Browsing, VirusTotal, URLhaus, Tavily, scam corpus RAG | `high_risk` / `medium_risk` / `unverified` / … |
| Job offer | WHOIS, DNS MX, web search, scam corpus | Flags upfront fees, free-mail domains |
| Crisis rumor | Fact Check Tools, NewsAPI, GDELT, Nominatim, gov search | `confirmed` / `likely_false` / `outdated` / `unverified` |

## Evaluation

Manual scenario checks against live agents (web + WhatsApp). Public fixtures: `tests/eval_cases/`. Fuller local fixtures: `_private/eval/eval_cases/`.

## Security

- Supabase Auth + RLS on user data
- Agent API: optional Supabase JWT, per-IP/per-user rate limits, browser CSRF (Origin allowlist + `X-Safeline-Client`)
- WhatsApp: webhook HMAC, CSRF bypass for `/whatsapp*`, inbound message-id dedup, relay secret on Vercel
- PII strip, prompt-injection flagging, evidence floor, scope guardrails

## Demo video script

1. **Web — Scam:** Paste HDFC KYC SMS in `/chat`, show cited verdict card.
2. **Web — Job:** Paste Amazon WFH fee offer, show HIGH RISK + sources.
3. **Web — Crisis:** Earthquake “predicted today 4–6 PM”, show `likely_false`.
4. **Contrast:** PM-Kisan credit with `pmkisan.gov.in` → `likely_safe`.
5. **WhatsApp:** Send **hi** → interactive **Choose** list → Scam / Job / Crisis / Reset; paste or photo; optional post-verdict buttons.
6. **Educational Q:** Ask “how does phishing happen” — short explanation, not a lottery verdict from history.
7. **Dashboard:** Linked WhatsApp phone and checks in Archive.

## Limitations

- External API quotas (VirusTotal, NewsAPI) may rate-limit during heavy testing.
- Crisis agent returns `unverified` when live APIs are unavailable — by design.
- Meta Business verification required for production WhatsApp reach beyond test numbers.
- Guest API is open by default (rate-limited); tighten with `API_REQUIRE_AUTH` if needed.
- Some benign bank debit SMS can still false-positive as HIGH RISK — prefer PM-Kisan for “safe” contrast demos.

## Responsible use

- PII stripped before logging
- No advice to click suspicious links to “verify”
- Domain-specific disclaimers on every verdict
- `needs_human_review` surfaced when evidence is thin

## Future work

- SSE streaming for long-running checks
- Full Meta Business verification
- Broader source coverage for niche cases
- Persistent Redis-backed WhatsApp webhook dedup (beyond in-memory)
