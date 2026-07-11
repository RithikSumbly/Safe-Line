---
title: SafeLine
sdk: docker
app_port: 7860
---

# SafeLine

Trust and safety platform for verifying suspicious messages (scams, fake job offers, crisis rumors) with cited evidence.

- **Frontend:** [safe-line-khaki.vercel.app](https://safe-line-khaki.vercel.app)
- **Backend:** [celestiallord-safe-line.hf.space](https://celestiallord-safe-line.hf.space)
- **Repo:** [github.com/RithikSumbly/Safe-Line](https://github.com/RithikSumbly/Safe-Line)

## Dataset

**Reference source:** [FTC job scams guidance](https://consumer.ftc.gov/articles/job-scams) (Federal Trade Commission consumer advice on scam patterns).

**Starter data:** [`data/sample_scam_messages.csv`](data/sample_scam_messages.csv) — 18 synthetic rows aligned to the capstone spec columns:

`message, channel, requested_action, money_request, urgency_words, link_present, risk_label`

This is synthetic starter data for exploration and evaluation, not live user data.

At runtime, the scam agent extracts similar signals in [`Backend/agent-service/app/agents/scam.py`](Backend/agent-service/app/agents/scam.py) (`ScamSignals`: urgency words, money request, link presence).

## Quick start

See [`Backend/README.md`](Backend/README.md) for API setup, WhatsApp webhook, and environment variables.

```bash
# Backend (local)
cd Backend/agent-service
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Frontend (local)
cd Frontend
npm install
npm run dev
```

## Project docs

- [`docs/project_report.md`](docs/project_report.md) — architecture, evaluation, limitations
- [`Project_03_CP_AAI_Scam_Message_Safety_Agent.md`](Project_03_CP_AAI_Scam_Message_Safety_Agent.md) — capstone spec
