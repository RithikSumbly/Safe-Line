/** Mock feed — swap for Supabase realtime on `checks` later. */
import { ledgerSeverityFromLabel } from "@/lib/riskSemantics";

export type LedgerSeverity = "risk" | "verified" | "pending";

export interface LedgerFeedItem {
  id: string;
  severity: LedgerSeverity;
  label: string;
  summary: string;
  minutesAgo: number;
  agent?: string;
}

export const LEDGER_SEED: LedgerFeedItem[] = [
  {
    id: "1",
    severity: "risk",
    label: "HIGH RISK",
    summary: "scam SMS · KYC link",
    minutesAgo: 2,
    agent: "scam",
  },
  {
    id: "2",
    severity: "verified",
    label: "VERIFIED SAFE",
    summary: "job offer · official domain",
    minutesAgo: 5,
    agent: "job",
  },
  {
    id: "3",
    severity: "pending",
    label: "UNVERIFIED",
    summary: "crisis forward · flood claim",
    minutesAgo: 8,
    agent: "crisis",
  },
  {
    id: "4",
    severity: "pending",
    label: "MEDIUM RISK",
    summary: "rental clause · deposit forfeiture",
    minutesAgo: 12,
    agent: "scam",
  },
  {
    id: "5",
    severity: "risk",
    label: "LIKELY FALSE",
    summary: "rumor · dam breach",
    minutesAgo: 15,
    agent: "crisis",
  },
  {
    id: "6",
    severity: "verified",
    label: "LOW RISK",
    summary: "scam SMS · benign reminder",
    minutesAgo: 18,
    agent: "scam",
  },
  {
    id: "7",
    severity: "risk",
    label: "HIGH RISK",
    summary: "UPI request · impersonation",
    minutesAgo: 22,
    agent: "scam",
  },
  {
    id: "8",
    severity: "verified",
    label: "VERIFIED SAFE",
    summary: "courier SMS · matched tracking",
    minutesAgo: 28,
    agent: "scam",
  },
];

export const LEDGER_ROTATION: Omit<LedgerFeedItem, "id" | "minutesAgo">[] = [
  { severity: "risk", label: "HIGH RISK", summary: "UPI payment request · impersonation", agent: "scam" },
  { severity: "pending", label: "UNVERIFIED", summary: "forwarded alert · no official source", agent: "crisis" },
  { severity: "verified", label: "VERIFIED SAFE", summary: "courier SMS · matched tracking", agent: "scam" },
  { severity: "pending", label: "MEDIUM RISK", summary: "job offer · Gmail sender", agent: "job" },
  { severity: "risk", label: "HIGH RISK", summary: "phishing link · bank KYC", agent: "scam" },
  { severity: "verified", label: "LOW RISK", summary: "utility bill · known provider", agent: "scam" },
  { severity: "risk", label: "LIKELY FALSE", summary: "evacuation rumor · no bulletin", agent: "crisis" },
  { severity: "pending", label: "MEDIUM RISK", summary: "crypto offer · unverified sender", agent: "scam" },
  { severity: "verified", label: "VERIFIED SAFE", summary: "employer domain · matched careers page", agent: "job" },
  { severity: "risk", label: "HIGH RISK", summary: "OTP request · suspicious number", agent: "scam" },
  { severity: "pending", label: "UNVERIFIED", summary: "weather alert · unconfirmed source", agent: "crisis" },
  { severity: "verified", label: "LOW RISK", summary: "appointment reminder · clinic domain", agent: "scam" },
  { severity: "risk", label: "HIGH RISK", summary: "parcel fee · fake customs link", agent: "scam" },
  { severity: "pending", label: "MEDIUM RISK", summary: "remote job · upfront training fee", agent: "job" },
  { severity: "risk", label: "LIKELY FALSE", summary: "water supply rumor · city denied", agent: "crisis" },
];

let rotationCounter = 100;
const recentLabels: string[] = [];

export function nextLedgerItem(): LedgerFeedItem {
  const pool = LEDGER_ROTATION;
  let template = pool[Math.floor(Math.random() * pool.length)];
  let attempts = 0;
  while (recentLabels.includes(template.label) && attempts < 12) {
    template = pool[Math.floor(Math.random() * pool.length)];
    attempts += 1;
  }

  const severity = ledgerSeverityFromLabel(template.label);
  rotationCounter += 1;
  recentLabels.unshift(template.label);
  if (recentLabels.length > 3) recentLabels.pop();

  return {
    id: `live-${rotationCounter}`,
    ...template,
    severity,
    minutesAgo: 0,
  };
}
