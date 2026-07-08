export type AgentType =
  | "scam"
  | "job_offer"
  | "crisis_rumor";

export type VerdictStatus =
  | "high_risk"
  | "medium_risk"
  | "low_risk"
  | "likely_safe"
  | "confirmed"
  | "likely_false"
  | "unverified"
  | "outdated";

export interface EvidenceItem {
  source_name: string;
  source_url: string | null;
  supports_claim: boolean;
  snippet: string;
}

export interface AgentVerdict {
  agent: AgentType;
  status: VerdictStatus;
  confidence: number;
  risk_score: number;
  red_flags: string[];
  evidence: EvidenceItem[];
  explanation: string;
  recommended_action: string;
  needs_human_review: boolean;
  disclaimer: string;
}

export type SpanSeverity = "risk" | "verified" | "pending";

export interface FlaggedSpan {
  start: number;
  end: number;
  tag: number;
  severity: SpanSeverity;
}

export interface AnnotatedVerdict extends AgentVerdict {
  input_text: string;
  flagged_spans: FlaggedSpan[];
}

export interface CheckInput {
  text: string;
  url?: string;
  email?: string;
  location?: string;
  jurisdiction?: string;
  fileName?: string;
  file?: File;
}

export interface CheckRecord {
  id: string;
  agent: AgentType;
  inputPreview: string;
  status: VerdictStatus;
  createdAt: string;
}

export const AGENT_LABELS: Record<AgentType, string> = {
  scam: "Scam Message",
  job_offer: "Fake Job Offer",
  crisis_rumor: "Crisis Rumor",
};

export const STATUS_STAMP: Record<
  VerdictStatus,
  { label: string; color: "risk" | "verified" | "pending" }
> = {
  high_risk: { label: "HIGH RISK", color: "risk" },
  medium_risk: { label: "MEDIUM RISK", color: "pending" },
  low_risk: { label: "LOW RISK", color: "pending" },
  likely_safe: { label: "VERIFIED SAFE", color: "verified" },
  confirmed: { label: "VERIFIED SAFE", color: "verified" },
  likely_false: { label: "LIKELY FALSE", color: "risk" },
  unverified: { label: "UNVERIFIED", color: "pending" },
  outdated: { label: "OUTDATED", color: "pending" },
};

export const SUPER_SCRIPT = ["⁰", "¹", "²", "³", "⁴", "⁵", "⁶", "⁷", "⁸", "⁹"];

export function toSuperscript(n: number): string {
  return String(n)
    .split("")
    .map((d) => SUPER_SCRIPT[Number(d)] ?? d)
    .join("");
}
