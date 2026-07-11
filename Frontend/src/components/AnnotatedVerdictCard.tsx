import { Check, Copy, ExternalLink, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { submitFeedback } from "@/lib/feedbackApi";
import { confidenceBarClass, riskScoreBarClass } from "@/lib/riskSemantics";
import { cn } from "@/lib/cn";
import type { AnnotatedVerdict, FlaggedSpan } from "@/types/agent";
import { STATUS_STAMP, STATUS_SUMMARY, toSuperscript } from "@/types/agent";

interface AnnotatedVerdictCardProps {
  verdict: AnnotatedVerdict;
  animate?: boolean;
  condensed?: boolean;
  className?: string;
  runId?: string | null;
}

const SEVERITY_COLORS = {
  risk: "text-risk decoration-risk",
  verified: "text-verified decoration-verified",
  pending: "text-pending decoration-pending",
} as const;

const STAMP_COLORS = {
  risk: "border-risk text-risk",
  verified: "border-verified text-verified",
  pending: "border-pending text-pending",
} as const;

function buildSegments(
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

function actionSteps(action: string): string[] {
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

export function AnnotatedVerdictCard({
  verdict,
  animate = true,
  condensed = false,
  className,
  runId,
}: AnnotatedVerdictCardProps) {
  const reduced = usePrefersReducedMotion();
  const [ready, setReady] = useState(!animate);
  const [barReady, setBarReady] = useState(!animate);
  const [feedbackState, setFeedbackState] = useState<"idle" | "submitting" | "done">("idle");
  const [copied, setCopied] = useState(false);
  const stamp = STATUS_STAMP[verdict.status];
  const isHighRisk =
    stamp.color === "risk" &&
    (verdict.status === "high_risk" || verdict.risk_score >= 70);
  const evidence = condensed
    ? verdict.evidence.slice(0, 2)
    : verdict.evidence;

  const segments = useMemo(
    () => buildSegments(verdict.input_text, verdict.flagged_spans),
    [verdict.input_text, verdict.flagged_spans],
  );
  const nextSteps = useMemo(
    () => actionSteps(verdict.recommended_action),
    [verdict.recommended_action],
  );
  const showHighlights =
    verdict.flagged_spans.length > 0 && verdict.red_flags.length > 0;
  const familyRewrite = verdict.family_friendly_rewrite?.trim();

  async function handleFeedback(helpful: boolean) {
    if (!runId || feedbackState !== "idle") return;
    setFeedbackState("submitting");
    try {
      await submitFeedback(runId, helpful);
      setFeedbackState("done");
    } catch {
      setFeedbackState("idle");
    }
  }

  async function copyFamilyMessage() {
    if (!familyRewrite) return;
    try {
      await navigator.clipboard.writeText(familyRewrite);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    if (!animate) {
      setReady(true);
      setBarReady(true);
      return;
    }
    setReady(false);
    setBarReady(false);
    if (reduced) {
      setReady(true);
      setBarReady(true);
      return;
    }
    const t = setTimeout(() => setReady(true), 50);
    const b = setTimeout(() => setBarReady(true), 400);
    return () => {
      clearTimeout(t);
      clearTimeout(b);
    };
  }, [animate, verdict, reduced]);

  return (
    <article
      className={cn(
        "relative border border-line border-t-[3px] bg-paper",
        stamp.color === "risk" && "border-t-risk",
        stamp.color === "verified" && "border-t-verified",
        stamp.color === "pending" && "border-t-pending",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-2.5 md:px-6">
        <div className="min-w-0 flex-1">
          <span className="kicker">Filed verdict</span>
          <span className="mt-1 block font-mono text-[10px] text-ink/40">
            {verdict.agent.replace("_", " ")} · risk {verdict.risk_score}
          </span>
        </div>
        <div className="relative h-14 w-14 shrink-0">
          {isHighRisk && ready && (
            <span
              className="pointer-events-none absolute inset-0 rounded-full border-2 border-risk/40 animate-[risk-ring-pulse_2s_ease-in-out_infinite]"
              aria-hidden
            />
          )}
          {stamp.color === "verified" && ready && (
            <span
              className="pointer-events-none absolute inset-0 rounded-full shadow-[0_0_18px_rgba(30,111,92,0.35)]"
              aria-hidden
            />
          )}
          {animate && ready && !reduced && (
            <span
              className="pointer-events-none absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full bg-alive/25 animate-[stamp-ripple_0.45s_ease-out_forwards]"
              aria-hidden
            />
          )}
          <div
            className={cn(
              "stamp-grain relative flex h-14 w-14 items-center justify-center rounded-full border-[3px] border-double text-center",
              STAMP_COLORS[stamp.color],
              animate &&
                ready &&
                "animate-[stamp-in_0.6s_cubic-bezier(0.34,1.56,0.64,1)_forwards]",
              !animate && "-rotate-[8deg]",
              animate && ready && "-rotate-[8deg]",
            )}
            style={animate && !ready ? { opacity: 0 } : undefined}
            aria-label={`Verdict: ${stamp.label}`}
          >
            <span className="px-0.5 font-mono text-[8px] font-medium leading-tight tracking-wide">
              {stamp.label}
            </span>
          </div>
        </div>
      </div>

      <div className="relative p-5 md:p-6">
        <p className="mb-4 font-sans text-sm leading-relaxed text-ink/70">
          {STATUS_SUMMARY[verdict.status]}
        </p>

        {verdict.explanation && (
          <div className="mb-6">
            <h3 className="kicker mb-2">Summary</h3>
            <p className="font-sans text-sm leading-relaxed text-ink">
              {verdict.explanation}
            </p>
          </div>
        )}

        <div className="mb-6">
          <h3 className="kicker mb-2">Your message</h3>
          {showHighlights && (
            <p className="mb-2 font-mono text-[10px] text-ink/45">
              Underlined phrases match the issues listed below (¹, ², ³…).
            </p>
          )}
          <p className="font-mono text-sm leading-relaxed text-ink whitespace-pre-wrap">
            {!showHighlights
              ? verdict.input_text
              : segments.map((seg, i) => {
              if (!seg.span) {
                return <span key={i}>{seg.text}</span>;
              }
              const delay = seg.span.tag * 0.12;
              const flagLabel = verdict.red_flags[seg.span.tag - 1];
              return (
                <span key={i} className="relative inline">
                  <span
                    className={cn(
                      "relative inline pb-0.5",
                      SEVERITY_COLORS[seg.span.severity],
                    )}
                    title={flagLabel}
                  >
                    <span
                      className={cn(
                        "absolute bottom-0 left-0 h-0.5 w-full origin-left bg-alive",
                        animate &&
                          ready &&
                          !reduced &&
                          "animate-[underline-glow-draw_0.55s_ease-out_forwards]",
                      )}
                      style={{
                        animationDelay:
                          animate && ready && !reduced ? `${delay}s` : undefined,
                        transform: animate && !ready ? "scaleX(0)" : undefined,
                      }}
                    />
                    <span
                      className={cn(
                        "absolute bottom-0 left-0 h-0.5 w-full origin-left",
                        seg.span.severity === "risk" && "bg-risk",
                        seg.span.severity === "verified" && "bg-verified",
                        seg.span.severity === "pending" && "bg-pending",
                        animate &&
                          ready &&
                          "animate-[underline-draw_0.5s_ease-out_forwards]",
                        !animate && "scale-x-100",
                      )}
                      style={{
                        animationDelay:
                          animate && ready ? `${delay + 0.08}s` : undefined,
                        transform: animate && !ready ? "scaleX(0)" : undefined,
                      }}
                    />
                    <span className="relative">{seg.text}</span>
                    <span
                      className="absolute -top-3 left-0 font-mono text-[10px] leading-none"
                      aria-hidden
                    >
                      {toSuperscript(seg.span.tag)}
                    </span>
                  </span>
                </span>
              );
            })}
          </p>
        </div>

        {verdict.red_flags.length > 0 && (
          <div className="mb-6 border-t border-line pt-6">
            <h3 className="kicker mb-4">
              {verdict.status === "likely_false" || verdict.status === "high_risk"
                ? "Why we flagged this"
                : verdict.status === "unverified"
                  ? "What we could not verify"
                  : "Key findings"}
            </h3>
            <ol className="space-y-3">
              {verdict.red_flags.map((flag, i) => (
                <li
                  key={i}
                  className="flex gap-3 font-sans text-sm leading-relaxed text-ink"
                >
                  <span className="shrink-0 font-mono text-xs text-ink/50">
                    {toSuperscript(i + 1)}
                  </span>
                  <span>{flag}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        <div className="mb-6 border-t border-line pt-6">
          <h3 className="kicker mb-4">Sources checked</h3>
          <ol className="space-y-4">
            {evidence.map((item, i) => (
              <li
                key={item.source_name + i}
                className={cn(
                  "flex gap-3",
                  animate &&
                    ready &&
                    !reduced &&
                    "animate-[evidence-in_0.45s_cubic-bezier(0.34,1.56,0.64,1)_forwards]",
                  animate && ready && reduced && "animate-[fade-up_0.4s_ease-out_forwards]",
                )}
                style={
                  animate && ready
                    ? {
                        animationDelay: `${0.25 + i * 0.06}s`,
                        opacity: ready ? undefined : 0,
                      }
                    : undefined
                }
              >
                <span className="mt-0.5 shrink-0" aria-hidden>
                  {item.supports_claim ? (
                    <Check className="h-4 w-4 text-verified" strokeWidth={2} />
                  ) : (
                    <X className="h-4 w-4 text-risk" strokeWidth={2} />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-xs font-medium text-ink">
                    {i + 1}. {item.source_name}
                  </p>
                  <p className="mt-1 font-sans text-sm text-ink/70">
                    {item.snippet}
                  </p>
                  {item.source_url && (
                    <a
                      href={item.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-flex items-center gap-1 font-mono text-xs text-verified hover:underline"
                    >
                      {new URL(item.source_url).hostname}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="mb-6 flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[160px]">
            <div className="mb-1 flex justify-between font-mono text-xs text-ink/60">
              <span>Confidence</span>
              <span>{Math.round(verdict.confidence * 100)}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden bg-line">
              <div
                className={cn(
                  "h-full transition-[width] duration-[900ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] motion-reduce:transition-none",
                  confidenceBarClass(),
                )}
                style={{
                  width: barReady
                    ? `${verdict.confidence * 100}%`
                    : "0%",
                }}
              />
            </div>
          </div>
          <div className="min-w-[120px] flex-1">
            <div className="mb-1 flex justify-between font-mono text-xs text-ink/60">
              <span>Risk score</span>
              <span className="font-medium text-ink">{verdict.risk_score}</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden bg-line">
              <div
                className={cn(
                  "h-full transition-[width] duration-[900ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] motion-reduce:transition-none",
                  riskScoreBarClass(verdict.risk_score),
                )}
                style={{
                  width: barReady ? `${verdict.risk_score}%` : "0%",
                }}
              />
            </div>
          </div>
        </div>

        <div
          className={cn(
            "mb-4 border-l-[3px] px-4 py-3",
            stamp.color === "risk" && "border-l-risk bg-risk/[0.06]",
            stamp.color === "verified" && "border-l-verified bg-verified/[0.06]",
            stamp.color === "pending" && "border-l-pending bg-pending/[0.06]",
          )}
        >
          <h3 className="kicker mb-3">What to do next</h3>
          {nextSteps.length > 1 ? (
            <ol className="list-decimal space-y-2 pl-4 font-sans text-sm font-medium text-ink">
              {nextSteps.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          ) : (
            <p className="font-sans text-sm font-medium text-ink">
              {verdict.recommended_action}
            </p>
          )}
        </div>

        {verdict.agent === "scam" && familyRewrite && (
          <div className="mb-6 border-t border-line pt-6">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="kicker">Message for family</h3>
              <button
                type="button"
                onClick={() => void copyFamilyMessage()}
                className="inline-flex items-center gap-1 font-mono text-[10px] text-verified hover:underline"
              >
                <Copy className="h-3 w-3" />
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <p className="font-sans text-sm leading-relaxed text-ink whitespace-pre-wrap">
              {familyRewrite}
            </p>
          </div>
        )}

        <p className="font-mono text-[11px] text-ink/40">{verdict.disclaimer}</p>

        {runId && (
          <div className="mt-4 border-t border-line pt-4">
            {feedbackState === "done" ? (
              <p className="font-sans text-xs text-ink/50">Thanks for your feedback.</p>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-sans text-xs text-ink/60">Was this helpful?</span>
                <button
                  type="button"
                  disabled={feedbackState === "submitting"}
                  onClick={() => void handleFeedback(true)}
                  className="rounded border border-verified/40 px-3 py-1 font-mono text-xs text-verified hover:bg-verified/[0.06] disabled:opacity-50"
                >
                  Yes
                </button>
                <button
                  type="button"
                  disabled={feedbackState === "submitting"}
                  onClick={() => void handleFeedback(false)}
                  className="rounded border border-line px-3 py-1 font-mono text-xs text-ink/70 hover:bg-ink/[0.04] disabled:opacity-50"
                >
                  No
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
