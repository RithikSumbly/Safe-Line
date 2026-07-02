/** Mock feed — swap for Supabase realtime on `checks` later. */
export type LedgerSeverity = "risk" | "verified" | "pending";

export interface LedgerFeedItem {
  id: string;
  severity: LedgerSeverity;
  label: string;
  summary: string;
  minutesAgo: number;
}

export const LEDGER_SEED: LedgerFeedItem[] = [
  {
    id: "1",
    severity: "risk",
    label: "HIGH RISK",
    summary: "scam SMS · KYC link",
    minutesAgo: 2,
  },
  {
    id: "2",
    severity: "verified",
    label: "VERIFIED SAFE",
    summary: "job offer · official domain",
    minutesAgo: 5,
  },
  {
    id: "3",
    severity: "pending",
    label: "UNVERIFIED",
    summary: "crisis forward · flood claim",
    minutesAgo: 8,
  },
  {
    id: "4",
    severity: "risk",
    label: "HIGH RISK",
    summary: "rental clause · deposit forfeiture",
    minutesAgo: 12,
  },
  {
    id: "5",
    severity: "risk",
    label: "LIKELY FALSE",
    summary: "rumor · dam breach",
    minutesAgo: 15,
  },
  {
    id: "6",
    severity: "verified",
    label: "LOW RISK",
    summary: "scam SMS · benign reminder",
    minutesAgo: 18,
  },
];

export const LEDGER_ROTATION: Omit<LedgerFeedItem, "id" | "minutesAgo">[] = [
  {
    severity: "risk",
    label: "HIGH RISK",
    summary: "UPI payment request · impersonation",
  },
  {
    severity: "pending",
    label: "UNVERIFIED",
    summary: "forwarded alert · no official source",
  },
  {
    severity: "verified",
    label: "VERIFIED SAFE",
    summary: "courier SMS · matched tracking",
  },
  {
    severity: "risk",
    label: "MEDIUM RISK",
    summary: "job offer · Gmail sender",
  },
];

let rotationCounter = 100;

export function nextLedgerItem(): LedgerFeedItem {
  const template =
    LEDGER_ROTATION[rotationCounter % LEDGER_ROTATION.length];
  rotationCounter += 1;
  return {
    id: `live-${rotationCounter}`,
    ...template,
    minutesAgo: 0,
  };
}
