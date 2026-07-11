import type {
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

export function getActionSteps(verdict: AnnotatedVerdict): string[] {
  const parsed = actionSteps(verdict.recommended_action);
  if (parsed.length > 0) return parsed.slice(0, 4);

  // Last resort only — prefer backend/LLM recommended_action always.
  if (verdict.explanation.trim()) {
    return [
      `Based on our check: ${verdict.explanation.trim().replace(/\s+/g, " ")}`,
    ];
  }
  return ["Verify through official sources before forwarding or acting on this message."];
}

export function getFamilyExplanation(verdict: AnnotatedVerdict): string {
  const rewrite = verdict.family_friendly_rewrite?.trim();
  if (rewrite) return rewrite;

  const topFlag = verdict.red_flags[0];
  if (verdict.agent === "crisis_rumor") {
    if (verdict.explanation && topFlag) {
      return `${verdict.explanation} ${topFlag} Please wait for official confirmation before sharing.`;
    }
    if (verdict.explanation) return verdict.explanation;
    return (
      "This forwarded message makes a claim we couldn't verify. " +
      "Official updates come from government or board websites — safest not to share until confirmed."
    );
  }

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
