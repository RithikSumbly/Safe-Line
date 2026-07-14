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
  family_friendly_rewrite?: string;
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

export interface CheckResponse {
  verdict: AnnotatedVerdict;
  run_id: string | null;
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

/** Plain-language summary shown under the stamp */
export const STATUS_SUMMARY: Record<VerdictStatus, string> = {
  high_risk: "This message shows strong signs of a scam or fraud.",
  medium_risk: "Several warning signs were found — proceed with caution.",
  low_risk: "Some minor concerns, but nothing critical on its own.",
  likely_safe: "No major red flags found in our checks.",
  confirmed: "Official or fact-checked sources support this claim.",
  likely_false: "Fact-checkers or official sources contradict this claim.",
  unverified: "We could not confirm or debunk this claim from live sources.",
  outdated: "This may have been true in the past but is no longer current.",
};

export const SUPER_SCRIPT = ["⁰", "¹", "²", "³", "⁴", "⁵", "⁶", "⁷", "⁸", "⁹"];

export function toSuperscript(n: number): string {
  return String(n)
    .split("")
    .map((d) => SUPER_SCRIPT[Number(d)] ?? d)
    .join("");
}

export type ChatRole = "user" | "assistant" | "system";
export type ChatMessageType =
  | "text"
  | "verdict"
  | "clarification"
  | "help"
  | "error";

export type ChatToolName =
  | "check_scam_message"
  | "check_job_offer"
  | "check_crisis_rumor"
  | "answer_safety_question";

export interface ChatHistoryItem {
  role: ChatRole;
  content: string;
}

export interface ChatMessageResponse {
  type: ChatMessageType;
  session_id: string;
  tool_used?: ChatToolName | null;
  assistant_text: string;
  verdict?: AnnotatedVerdict | null;
  run_id?: string | null;
}

export interface ThreadMessage {
  id: string;
  role: ChatRole;
  content: string;
  messageType: ChatMessageType;
  verdict?: AnnotatedVerdict;
  runId?: string | null;
  createdAt: string;
  /** Screenshot shown in the sent bubble (in-session + persisted when signed in) */
  imageDataUrl?: string;
}

export interface ChatSession {
  id: string;
  title: string | null;
  updatedAt: string;
}
