# SafeLine Project Report

**Team AURA** — Himshikhar 2026 Agentic AI Capstone

| Name | Roll No. |
|---|---|
| Rithik Vimal Sumbly | 216 |
| Suave Krishan Doda | 234 |
| Kushagra Mathur | 136 |
| Ruthwin Venkatesh | 184 |
| Tushika Gupta | 166 |

## Problem

SafeLine is a unified trust & safety platform helping users verify suspicious messages, job offers, and crisis rumors before they act. Every verdict is grounded in named external sources — not LLM guesses alone.

## Reference data

- **Primary corpus:** [`data/scam_reference_corpus.json`](../data/scam_reference_corpus.json) — RBI/NPCI/FTC-style advisories, embedded with `gemini-embedding-001` into Supabase pgvector
- **External:** [FTC job scams guidance](https://consumer.ftc.gov/articles/job-scams)
- **Supplementary:** [`data/sample_scam_messages.csv`](../data/sample_scam_messages.csv) — labeled example messages (capstone CSV format)

## Architecture

- **Frontend:** Vite + React + Supabase Auth/history
- **Backend:** FastAPI + Gemini agent pipelines
- **Database:** Supabase Postgres + pgvector
- **WhatsApp:** Meta Cloud API webhook

## Agent logic summary

| Agent | Key tools | Output |
|-------|-----------|--------|
| Scam | Safe Browsing, VirusTotal, URLhaus, scam corpus RAG | `high_risk` / `medium_risk` / `unverified` |
| Job offer | WHOIS, DNS MX, web search, scam corpus | Flags upfront fees, free-mail domains |
| Crisis rumor | Fact Check Tools, NewsAPI, GDELT, Nominatim, gov search | `confirmed` / `likely_false` / `outdated` / `unverified` |

## Evaluation

Manual scenario checks against live agents (web + WhatsApp). Regression fixtures are kept locally under `_private/eval/` (not part of public submission).

## Security

- Supabase Auth + RLS on user data
- Agent API: optional Supabase JWT, per-IP/per-user rate limits, browser CSRF protection
- WhatsApp webhook HMAC + relay secret

## Demo video script

1. **Web — Scam:** Paste HDFC KYC SMS on `/scam`, show cited verdict card.
2. **Web — Crisis:** Paste forwarded flood rumor with Kerala location, show fact-check sources.
3. **WhatsApp:** Forward same scam message to Meta test number, show `🟥 SafeLine verdict` reply.
4. **Dashboard:** Show linked WhatsApp phone and check appearing in Archive.

## Limitations

- External API quotas (VirusTotal, NewsAPI) may rate-limit during heavy testing.
- Crisis agent returns `unverified` when live APIs are unavailable — by design.
- Meta Business verification required for production WhatsApp reach beyond test numbers.

## Responsible use

- PII stripped before logging
- No advice to click suspicious links to "verify"
- Domain-specific disclaimers on every verdict
- `needs_human_review` surfaced when evidence is thin

## Future work

- SSE streaming for long-running checks
- Full Meta Business verification
- Broader source coverage for niche cases
- Upstash Redis caching for API quotas
