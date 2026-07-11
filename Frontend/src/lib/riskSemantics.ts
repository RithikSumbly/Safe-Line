import type { LedgerSeverity } from "@/data/liveLedgerFeed";

export function confidenceBarClass(): string {
  return "bg-verified";
}

export function riskScoreBarClass(score: number): string {
  if (score >= 70) return "bg-risk";
  if (score >= 40) return "bg-pending";
  return "bg-verified";
}

export function ledgerSeverityFromLabel(label: string): LedgerSeverity {
  const normalized = label.trim().toUpperCase();
  if (
    normalized === "HIGH RISK" ||
    normalized === "LIKELY FALSE"
  ) {
    return "risk";
  }
  if (
    normalized === "MEDIUM RISK" ||
    normalized === "UNVERIFIED"
  ) {
    return "pending";
  }
  return "verified";
}

export function ledgerLabelTextClass(severity: LedgerSeverity): string {
  if (severity === "risk") return "text-risk";
  if (severity === "pending") return "text-pending";
  return "text-verified";
}
