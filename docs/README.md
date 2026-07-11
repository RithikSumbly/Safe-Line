# SafeLine documentation

All project documentation lives here. The root [`README.md`](../README.md) is the primary entry point for evaluators.

| Document | Description |
|---|---|
| [`project_report.md`](project_report.md) | Capstone report — architecture, eval summary, responsible use |
| [`Project_03_CP_AAI_Scam_Message_Safety_Agent.md`](Project_03_CP_AAI_Scam_Message_Safety_Agent.md) | Official capstone brief |
| [`backend-setup.md`](backend-setup.md) | FastAPI agent service — run, deploy, WhatsApp webhook |
| [`backend-tooling.md`](backend-tooling.md) | Corpus seeding scripts (not deployed) |
| [`PROJECT_CONTEXT.md`](PROJECT_CONTEXT.md) | Frontend build history and design notes |
| [`PROJECT_CODEBASE_DOCUMENTATION.md`](PROJECT_CODEBASE_DOCUMENTATION.md) | Full codebase reference (internal) |

## Reference data

Production RAG corpus and ingestion sources are in [`../data/`](../data/):

- [`scam_reference_corpus.json`](../data/scam_reference_corpus.json) — RBI/NPCI/FTC-style advisories embedded into pgvector
- [`data.txt`](../data/data.txt) — source builder script for regenerating the corpus JSON
- [`sample_scam_messages.csv`](../data/sample_scam_messages.csv) — supplementary labeled examples (capstone CSV format)

External reference: [FTC job scams guidance](https://consumer.ftc.gov/articles/job-scams)
