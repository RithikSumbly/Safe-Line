# SafeLine Project Report

## Problem

SafeLine is a unified trust & safety platform helping users verify suspicious messages, job offers, crisis rumors, and rental agreements before they act. Every verdict is grounded in named external sources — not LLM guesses alone.

## Architecture

- **Frontend:** Vite + React + Supabase Auth/history
- **Backend:** FastAPI + Gemini + LangGraph-style agent pipelines
- **Database:** Supabase Postgres + pgvector
- **WhatsApp:** Meta Cloud API webhook

## Agent logic summary

| Agent | Key tools | Output |
|-------|-----------|--------|
| Scam | Safe Browsing, VirusTotal, URLhaus, scam corpus RAG | `high_risk` / `medium_risk` / `unverified` |
| Job offer | WHOIS, DNS MX, web search, scam corpus | Flags upfront fees, free-mail domains |
| Crisis rumor | Fact Check Tools, NewsAPI, GDELT, Nominatim, gov search | `confirmed` / `likely_false` / `outdated` / `unverified` |
| Rental | Legal corpus RAG (Tier 1–3), PDF extraction | Clause-level red flags vs India Code / NALSA |

## Evaluation results (sample run, 3 cases per agent, no API keys)

| Agent | Accuracy | False positive rate | False negative rate |
|-------|----------|---------------------|---------------------|
| scam | 1.0 | 0.0 | 0.0 |
| job_offer | 1.0 | 0.0 | 0.0 |
| crisis_rumor | 0.667 | 0.0 | 0.333 |
| rental_redflag | 1.0 | 0.0 | 0.0 |

Full harness: `python tests/eval/run_eval.py` (65 total cases). Results in `last_run_summary.json` and `eval_runs` table.

## Demo video script

1. **Web — Scam:** Paste HDFC KYC SMS on `/scam`, show cited verdict card.
2. **Web — Crisis:** Paste forwarded flood rumor with Kerala location, show fact-check sources.
3. **Web — Rental:** Upload PDF or paste clauses, show jurisdiction-aware flags.
4. **WhatsApp:** Forward same scam message to Meta test number, show `🟥 SafeLine verdict` reply.
5. **Dashboard:** Show linked WhatsApp phone and check appearing in Archive.

## Limitations

- External API quotas (VirusTotal, NewsAPI) may rate-limit during heavy testing.
- Crisis agent returns `unverified` when live APIs are unavailable — by design.
- Rental analysis is document literacy support, not legal advice.
- Meta Business verification required for production WhatsApp reach beyond test numbers.

## Responsible use

- PII stripped before logging
- No advice to click suspicious links to "verify"
- Domain-specific disclaimers on every verdict
- `needs_human_review` surfaced when evidence is thin

## Future work

- SSE streaming for long rental PDF analysis
- Full Meta Business verification
- Expanded state legal corpora
- Upstash Redis caching for API quotas
