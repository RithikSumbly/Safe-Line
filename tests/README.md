# Test cases

Regression fixtures for manual or scripted validation. Each line in `eval_cases/*.jsonl` is one scenario with an `expected_status` matching the agent verdict field.

| File | Agent |
|---|---|
| `scam.jsonl` | Scam message checker |
| `job_offer.jsonl` | Fake job offer checker |
| `crisis_rumor.jsonl` | Crisis rumor checker |

Fields per case: `id`, `suite` (1 = flagged, 2 = clean), `type`, `expected_status`, `input`, `notes`.

Run agents against `input` and compare the returned status to `expected_status`.
