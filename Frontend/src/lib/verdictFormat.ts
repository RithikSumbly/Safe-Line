import type {
  AgentType,
  AnnotatedVerdict,
  FlaggedSpan,
  VerdictStatus,
} from "@/types/agent";

export type FlagSeverityLevel = "high" | "medium";

export function buildSegments(
  text: string,
  spans: FlaggedSpan[],
): Array<{ text: string; span?: FlaggedSpan }> {
  const sorted = [...spans].sort((a, b) => a.start - b.start);
  const segments: Array<{ text: string; span?: FlaggedSpan }> = [];
  let cursor = 0;

  for (const span of sorted) {
    if (span.start > cursor) {
      segments.push({ text: text.slice(cursor, span.start) });
    }
    segments.push({
      text: text.slice(span.start, span.end),
      span,
    });
    cursor = span.end;
  }

  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor) });
  }

  return segments;
}

export function actionSteps(action: string): string[] {
  const trimmed = action.trim();
  if (!trimmed) return [];
  const lines = trimmed
    .split(/\n+/)
    .map((line) => line.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean);
  if (lines.length > 1) return lines;
  return trimmed
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

const FALLBACK_ACTIONS: Record<
  AgentType,
  Partial<Record<VerdictStatus, string[]>>
> = {
  scam: {
    high_risk: [
      "Don't click any links in the message.",
      "Don't share OTP, PIN, or bank details.",
      "Block the sender and delete the message.",
    ],
    medium_risk: [
      "Treat the message as suspicious and avoid replying.",
      "Don't click links or send money.",
      "Verify through official channels if unsure.",
    ],
    low_risk: [
      "Stay cautious and avoid sharing personal details.",
      "Delete the message if you didn't expect it.",
    ],
    likely_false: [
      "Don't act on the claim without independent verification.",
      "Check official sources before sharing or forwarding.",
    ],
    unverified: [
      "Don't click links until you've verified the sender.",
      "Contact the organization through official channels.",
    ],
  },
  job_offer: {
    high_risk: [
      "Don't pay any registration or onboarding fee.",
      "Verify the employer on their official careers site.",
      "Don't share identity documents over chat.",
    ],
    medium_risk: [
      "Confirm the offer through the company's official website.",
      "Be wary of personal email domains or Telegram-only contact.",
    ],
    unverified: [
      "Ask for a written offer on company letterhead.",
      "Verify the recruiter through official HR channels.",
    ],
  },
  crisis_rumor: {
    high_risk: [
      "Don't forward the message without checking official sources.",
      "Follow guidance from local disaster management authorities.",
    ],
    likely_false: [
      "Don't share the rumor — it may be outdated or fabricated.",
      "Check government and news sources before acting.",
    ],
    unverified: [
      "Treat the claim as unconfirmed until verified.",
      "Check official disaster or government channels.",
    ],
  },
};

export function getActionSteps(verdict: AnnotatedVerdict): string[] {
  const parsed = actionSteps(verdict.recommended_action);
  if (parsed.length > 0) return parsed.slice(0, 4);

  const fallback =
    FALLBACK_ACTIONS[verdict.agent]?.[verdict.status] ??
    FALLBACK_ACTIONS.scam.medium_risk;
  return fallback ?? ["Delete the message and avoid interacting with the sender."];
}

export function getFamilyExplanation(verdict: AnnotatedVerdict): string {
  const rewrite = verdict.family_friendly_rewrite?.trim();
  if (rewrite) return rewrite;

  const topFlag = verdict.red_flags[0];
  if (verdict.explanation && topFlag) {
    return `${verdict.explanation} ${topFlag} It's safest to ignore or delete the message without clicking links.`;
  }
  if (verdict.explanation) return verdict.explanation;
  if (topFlag) {
    return `This message looks suspicious: ${topFlag} It's safe to ignore or delete without responding.`;
  }
  return "This message shows signs of a common scam. Don't click links or share personal details — it's safe to delete.";
}

export function flagSeverity(
  status: VerdictStatus,
  riskScore: number,
): FlagSeverityLevel {
  if (
    status === "high_risk" ||
    status === "likely_false" ||
    riskScore >= 70
  ) {
    return "high";
  }
  return "medium";
}
