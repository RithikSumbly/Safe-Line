import { Copy } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AnnotatedMessageBlock } from "@/components/verdict/AnnotatedMessageBlock";
import { SourcesCheckedList } from "@/components/verdict/SourcesCheckedList";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { submitFeedback } from "@/lib/feedbackApi";
import { actionSteps } from "@/lib/verdictFormat";
import { confidenceBarClass, riskScoreBarClass } from "@/lib/riskSemantics";
import { cn } from "@/lib/cn";
import type { AnnotatedVerdict } from "@/types/agent";
import { STATUS_STAMP, STATUS_SUMMARY, toSuperscript } from "@/types/agent";

interface AnnotatedVerdictCardProps {
  verdict: AnnotatedVerdict;
  animate?: boolean;
  condensed?: boolean;
  className?: string;
  runId?: string | null;
}

const STAMP_COLORS = {
  risk: "border-risk text-risk",
  verified: "border-verified text-verified",
  pending: "border-pending text-pending",
} as const;

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

  const nextSteps = useMemo(
    () => actionSteps(verdict.recommended_action),
    [verdict.recommended_action],
  );
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
      <div className="flex items-center justify-between border-b border-line px-5 py-2.5 md:px-6">
        <span className="kicker">Filed verdict</span>
        <span className="font-mono text-[10px] text-ink/40">
          {verdict.agent.replace("_", " ")} · risk {verdict.risk_score}
        </span>
      </div>

      <div className="relative p-5 md:p-6 md:pt-7">
        <div className="pointer-events-none absolute -top-3 right-4 h-[72px] w-[72px]">
          {isHighRisk && ready && (
            <span
              className="absolute inset-0 rounded-full border-2 border-risk/40 animate-[risk-ring-pulse_2s_ease-in-out_infinite]"
              aria-hidden
            />
          )}
          {stamp.color === "verified" && ready && (
            <span
              className="absolute inset-0 rounded-full shadow-[0_0_18px_rgba(30,111,92,0.35)]"
              aria-hidden
            />
          )}
          {animate && ready && !reduced && (
            <span
              className="absolute left-1/2 top-1/2 h-[72px] w-[72px] rounded-full bg-alive/25 animate-[stamp-ripple_0.45s_ease-out_forwards]"
              aria-hidden
            />
          )}
          <div
            className={cn(
              "stamp-grain relative flex h-[72px] w-[72px] items-center justify-center rounded-full border-4 border-double text-center",
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
            <span className="px-1 font-mono text-[9px] font-medium leading-tight tracking-wide">
              {stamp.label}
            </span>
          </div>
        </div>

        <p className="mb-4 pr-16 font-sans text-sm leading-relaxed text-ink/70">
          {STATUS_SUMMARY[verdict.status]}
        </p>

        {verdict.explanation && (
          <div className="mb-6 pr-16">
            <h2 className="kicker mb-2">Summary</h2>
            <p className="font-sans text-sm leading-relaxed text-ink">
              {verdict.explanation}
            </p>
          </div>
        )}

        <div className="mb-6 pr-16">
          <AnnotatedMessageBlock
            verdict={verdict}
            animate={animate}
            ready={ready}
            reducedMotion={reduced}
          />
        </div>

        {verdict.red_flags.length > 0 && (
          <div className="mb-6 border-t border-line pt-6">
            <h2 className="kicker mb-4">
              {verdict.status === "likely_false" || verdict.status === "high_risk"
                ? "Why we flagged this"
                : verdict.status === "unverified"
                  ? "What we could not verify"
                  : "Key findings"}
            </h2>
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
          <SourcesCheckedList
            evidence={evidence}
            animate={animate}
            ready={ready}
            reducedMotion={reduced}
          />
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
          <h2 className="kicker mb-3">What to do next</h2>
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
          <div className="mb-6 border-t border-line pt-6 pr-16">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="kicker">Message for family</h2>
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
