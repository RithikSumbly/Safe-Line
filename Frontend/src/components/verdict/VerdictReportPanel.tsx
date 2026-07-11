import { AlertTriangle, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AnnotatedMessageBlock } from "@/components/verdict/AnnotatedMessageBlock";
import { RiskGauge } from "@/components/verdict/RiskGauge";
import { SourcesCheckedList } from "@/components/verdict/SourcesCheckedList";
import { submitFeedback } from "@/lib/feedbackApi";
import {
  flagSeverity,
  getActionSteps,
  getFamilyExplanation,
} from "@/lib/verdictFormat";
import { confidenceBarClass, riskScoreBarClass } from "@/lib/riskSemantics";
import { cn } from "@/lib/cn";
import type { AnnotatedVerdict } from "@/types/agent";
import { STATUS_SUMMARY } from "@/types/agent";

interface VerdictReportPanelProps {
  verdict: AnnotatedVerdict;
  open: boolean;
  onClose: () => void;
  runId?: string | null;
}

function RedFlagIcon({ severity }: { severity: "high" | "medium" }) {
  if (severity === "high") {
    return (
      <span
        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-risk/15 text-risk"
        aria-hidden
      >
        <X className="h-3 w-3" strokeWidth={2.5} />
      </span>
    );
  }
  return (
    <span
      className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-pending/15 text-pending"
      aria-hidden
    >
      <AlertTriangle className="h-3 w-3" strokeWidth={2.5} />
    </span>
  );
}

export function VerdictReportPanel({
  verdict,
  open,
  onClose,
  runId,
}: VerdictReportPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const [copied, setCopied] = useState(false);
  const [feedbackState, setFeedbackState] = useState<
    "idle" | "submitting" | "done"
  >("idle");

  const severity = flagSeverity(verdict.status, verdict.risk_score);
  const actionSteps = getActionSteps(verdict);
  const familyText = getFamilyExplanation(verdict);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeBtnRef.current?.focus();
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

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
    try {
      await navigator.clipboard.writeText(familyText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-40 bg-ink/20"
        aria-label="Close report"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="verdict-report-title"
        className="fixed right-0 top-16 bottom-0 z-50 flex w-[420px] flex-col border-l border-[#D9CBB5] bg-paper shadow-lg"
      >
        <div className="flex shrink-0 items-start justify-between border-b border-[#D9CBB5] px-5 py-4">
          <div>
            <p id="verdict-report-title" className="kicker">
              FILED VERDICT
            </p>
            <p className="mt-1 font-mono text-[10px] text-ink/40">
              {verdict.agent.replace("_", " ")} · risk {verdict.risk_score}
            </p>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded text-ink/60 hover:bg-ink/[0.06] hover:text-ink"
            aria-label="Close report"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 space-y-6">
          <section className="border-b border-[#D9CBB5] pb-6">
            <RiskGauge score={verdict.risk_score} />
            <p className="mt-3 font-sans text-sm text-ink/70">
              {STATUS_SUMMARY[verdict.status]}
            </p>
          </section>

          {verdict.explanation && (
            <section className="border-b border-[#D9CBB5] pb-6">
              <h3 className="kicker mb-2">Summary</h3>
              <p className="font-sans text-sm leading-relaxed text-ink">
                {verdict.explanation}
              </p>
            </section>
          )}

          <section className="border-b border-[#D9CBB5] pb-6">
            <AnnotatedMessageBlock verdict={verdict} />
          </section>

          {verdict.red_flags.length > 0 && (
            <section className="border-b border-[#D9CBB5] pb-6">
              <h3 className="kicker mb-4">Red flags</h3>
              <ul className="space-y-3">
                {verdict.red_flags.map((flag, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 font-sans text-sm leading-relaxed text-ink"
                  >
                    <RedFlagIcon severity={severity} />
                    <span>{flag}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="border-b border-[#D9CBB5] pb-6">
            <div className="rounded-lg border border-[#E0A458] bg-[#FCEFE3] p-4">
              <h3 className="mb-3 font-sans text-sm font-bold text-ink">
                What to do now
              </h3>
              <ul className="list-disc space-y-2 pl-4 font-sans text-sm text-ink">
                {actionSteps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ul>
            </div>
          </section>

          <section className="border-b border-[#D9CBB5] pb-6">
            <div className="rounded-lg border border-line bg-paper p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="font-sans text-sm font-semibold text-ink">
                  Explain this to a family member
                </h3>
                <button
                  type="button"
                  onClick={() => void copyFamilyMessage()}
                  className="rounded bg-[#1F6F5C] px-3 py-1.5 font-sans text-sm text-white hover:bg-[#175a4a]"
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
              <p className="font-sans text-sm leading-relaxed text-ink">
                {familyText}
              </p>
            </div>
          </section>

          <section className="border-b border-[#D9CBB5] pb-6">
            <SourcesCheckedList evidence={verdict.evidence} />
          </section>

          <section className="space-y-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="min-w-[160px] flex-1">
                <div className="mb-1 flex justify-between font-mono text-xs text-ink/60">
                  <span>Confidence</span>
                  <span>{Math.round(verdict.confidence * 100)}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden bg-line">
                  <div
                    className={cn("h-full", confidenceBarClass())}
                    style={{ width: `${verdict.confidence * 100}%` }}
                  />
                </div>
              </div>
              <div className="min-w-[120px] flex-1">
                <div className="mb-1 flex justify-between font-mono text-xs text-ink/60">
                  <span>Risk score</span>
                  <span className="font-medium text-ink">
                    {verdict.risk_score}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden bg-line">
                  <div
                    className={cn(
                      "h-full",
                      riskScoreBarClass(verdict.risk_score),
                    )}
                    style={{ width: `${verdict.risk_score}%` }}
                  />
                </div>
              </div>
            </div>

            <p className="font-mono text-[11px] text-ink/40">
              {verdict.disclaimer}
            </p>

            {runId && (
              <div className="border-t border-line pt-4">
                {feedbackState === "done" ? (
                  <p className="font-sans text-xs text-ink/50">
                    Thanks for your feedback.
                  </p>
                ) : (
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-sans text-xs text-ink/60">
                      Was this helpful?
                    </span>
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
          </section>
        </div>
      </div>
    </>
  );
}
