#!/usr/bin/env python3
"""Run eval harness for one or all agents."""

from __future__ import annotations

import argparse
import asyncio
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
AGENT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(AGENT_ROOT))

from app.agents.crisis_rumor import run_crisis_agent
from app.agents.job_offer import run_job_agent
from app.agents.rental_redflag import run_rental_agent
from app.agents.scam import run_scam_agent
from app.core.schemas import CheckInput
from app.db.supabase_client import get_supabase

RUNNERS = {
    "scam": run_scam_agent,
    "job_offer": run_job_agent,
    "crisis_rumor": run_crisis_agent,
    "rental_redflag": run_rental_agent,
}

RISK_STATUSES = {"high_risk", "medium_risk", "likely_false"}
SAFE_STATUSES = {"likely_safe", "low_risk", "confirmed"}


def _load_cases(agent: str) -> list[dict]:
    path = ROOT / "data" / "eval_test_cases" / f"{agent}.jsonl"
    cases = []
    for line in path.read_text().splitlines():
        if line.strip():
            cases.append(json.loads(line))
    return cases


def _is_correct(expected: str, actual: str) -> bool:
    if expected == actual:
        return True
    exp_risky = expected in RISK_STATUSES
    act_risky = actual in RISK_STATUSES
    exp_safe = expected in SAFE_STATUSES
    act_safe = actual in SAFE_STATUSES
    if exp_risky and act_risky:
        return True
    if exp_safe and act_safe:
        return True
    if expected == "unverified" and actual in ("unverified", "outdated", "medium_risk"):
        return True
    return False


async def run_agent_eval(agent: str, limit: int | None = None) -> dict:
    runner = RUNNERS[agent]
    cases = _load_cases(agent)[:limit] if limit else _load_cases(agent)
    correct = 0
    false_pos = 0
    false_neg = 0
    results = []

    for case in cases:
        inp = CheckInput(
            text=case["text"],
            location=case.get("location"),
            jurisdiction=case.get("jurisdiction"),
        )
        verdict = await runner(inp)
        ok = _is_correct(case["expected_status"], verdict.status)
        if ok:
            correct += 1
        exp_risky = case["expected_status"] in RISK_STATUSES
        act_risky = verdict.status in RISK_STATUSES
        if not exp_risky and act_risky:
            false_pos += 1
        if exp_risky and not act_risky:
            false_neg += 1
        results.append(
            {
                "id": case["id"],
                "expected": case["expected_status"],
                "actual": verdict.status,
                "correct": ok,
            }
        )
        client = get_supabase()
        if client:
            try:
                client.table("eval_runs").insert(
                    {
                        "agent": agent,
                        "test_case_id": case["id"],
                        "expected_status": case["expected_status"],
                        "actual_status": verdict.status,
                        "correct": ok,
                    }
                ).execute()
            except Exception:
                pass

    n = len(cases) or 1
    return {
        "agent": agent,
        "total": len(cases),
        "accuracy": round(correct / n, 3),
        "false_positive_rate": round(false_pos / n, 3),
        "false_negative_rate": round(false_neg / n, 3),
        "results": results,
    }


async def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--agent", choices=list(RUNNERS.keys()))
    parser.add_argument("--limit", type=int, default=None)
    args = parser.parse_args()

    agents = [args.agent] if args.agent else list(RUNNERS.keys())
    summary = []
    for agent in agents:
        report = await run_agent_eval(agent, args.limit)
        summary.append(report)
        print(f"\n=== {agent} ===")
        print(f"Accuracy: {report['accuracy']}")
        print(f"False positive rate: {report['false_positive_rate']}")
        print(f"False negative rate: {report['false_negative_rate']}")

    out = ROOT / "data" / "eval_test_cases" / "last_run_summary.json"
    out.write_text(json.dumps(summary, indent=2))
    print(f"\nSummary written to {out}")


if __name__ == "__main__":
    asyncio.run(main())
