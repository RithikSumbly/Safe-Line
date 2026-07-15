import { AlertTriangle, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
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

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

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
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const [copied, setCopied] = useState(false);
  const [feedbackState, setFeedbackState] = useState<
    "idle" | "submitting" | "done"
  >("idle");

  const severity = flagSeverity(verdict.status, verdict.risk_score);
  const actionSteps = getActionSteps(verdict);
  const familyText = getFamilyExplanation(verdict);

  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Defer focus so panel is mounted
    const t = window.setTimeout(() => closeBtnRef.current?.focus(), 0);

    return () => {
      window.clearTimeout(t);
      document.body.style.overflow = prevOverflow;
      previousFocusRef.current?.focus?.();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const nodes = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter((el) => !el.hasAttribute("disabled") && el.offsetParent !== null);
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
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
      <div
        className="fixed inset-0 z-40 bg-ink/20"
        aria-hidden="true"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="fixed right-0 top-16 bottom-0 z-50 flex w-[min(100vw,420px)] flex-col border-l border-line bg-paper shadow-lg"
      >
        <div className="flex shrink-0 items-start justify-between border-b border-line px-5 py-4">
          <div>
            <h2 id={titleId} className="kicker">
              Filed verdict
            </h2>
            <p className="mt-1 font-mono text-[10px] text-ink/55">
              {verdict.agent.replace("_", " ")} · risk {verdict.risk_score}
            </p>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            className="a11y-control flex h-11 w-11 items-center justify-center rounded text-ink/65 hover:bg-ink/[0.06] hover:text-ink"
            aria-label="Close report"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-6">
          <section className="border-b border-line pb-6" aria-labelledby="risk-heading">
            <h3 id="risk-heading" className="sr-only">
              Risk score
            </h3>
            <RiskGauge score={verdict.risk_score} />
            <p className="mt-3 font-sans text-sm text-ink/70">
              {STATUS_SUMMARY[verdict.status]}
            </p>
          </section>

          {verdict.explanation && (
            <section className="border-b border-line pb-6">
              <h3 className="kicker mb-2">Summary</h3>
              <p className="font-sans text-sm leading-relaxed text-ink">
                {verdict.explanation}
              </p>
            </section>
          )}

          <section className="border-b border-line pb-6">
            <AnnotatedMessageBlock verdict={verdict} />
          </section>

          {verdict.red_flags.length > 0 && (
            <section className="border-b border-line pb-6">
              <h3 className="kicker mb-4">Red flags</h3>
              <ul className="space-y-3">
                {verdict.red_flags.map((flag, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 font-sans text-sm leading-relaxed text-ink"
                  >
                    <RedFlagIcon severity={severity} />
                    <span>
                      <span className="sr-only">
                        {severity === "high" ? "High severity: " : "Medium severity: "}
                      </span>
                      {flag}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="border-b border-line pb-6">
            <div className="rounded-lg border border-pending/50 bg-pending-soft/60 p-4">
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

          <section className="border-b border-line pb-6">
            <div className="rounded-lg border border-line bg-paper p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="font-sans text-sm font-semibold text-ink">
                  Explain this to a family member
                </h3>
                <button
                  type="button"
                  onClick={() => void copyFamilyMessage()}
                  className="a11y-control rounded bg-[var(--color-cta)] px-3 py-1.5 font-sans text-sm text-paper hover:bg-[var(--color-cta-hover)]"
                  aria-live="polite"
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
              <p className="font-sans text-sm leading-relaxed text-ink">
                {familyText}
              </p>
            </div>
          </section>

          <section className="border-b border-line pb-6">
            <SourcesCheckedList evidence={verdict.evidence} />
          </section>

          <section className="space-y-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="min-w-[160px] flex-1">
                <div className="mb-1 flex justify-between font-mono text-xs text-ink/65">
                  <span id="confidence-label">Confidence</span>
                  <span>{Math.round(verdict.confidence * 100)}%</span>
                </div>
                <div
                  className="h-1.5 w-full overflow-hidden bg-line"
                  role="meter"
                  aria-labelledby="confidence-label"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(verdict.confidence * 100)}
                >
                  <div
                    className={cn("h-full", confidenceBarClass())}
                    style={{ width: `${verdict.confidence * 100}%` }}
                    aria-hidden
                  />
                </div>
              </div>
              <div className="min-w-[120px] flex-1">
                <div className="mb-1 flex justify-between font-mono text-xs text-ink/65">
                  <span id="risk-bar-label">Risk score</span>
                  <span className="font-medium text-ink">
                    {verdict.risk_score}
                  </span>
                </div>
                <div
                  className="h-1.5 w-full overflow-hidden bg-line"
                  role="meter"
                  aria-labelledby="risk-bar-label"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={verdict.risk_score}
                >
                  <div
                    className={cn(
                      "h-full",
                      riskScoreBarClass(verdict.risk_score),
                    )}
                    style={{ width: `${verdict.risk_score}%` }}
                    aria-hidden
                  />
                </div>
              </div>
            </div>

            <p className="font-mono text-[11px] text-ink/55">
              {verdict.disclaimer}
            </p>

            {runId && (
              <div className="border-t border-line pt-4">
                {feedbackState === "done" ? (
                  <p className="font-sans text-xs text-ink/65" role="status">
                    Thanks for your feedback.
                  </p>
                ) : (
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-sans text-xs text-ink/65" id="feedback-prompt">
                      Was this helpful?
                    </span>
                    <button
                      type="button"
                      disabled={feedbackState === "submitting"}
                      onClick={() => void handleFeedback(true)}
                      className="a11y-control rounded border border-verified/40 px-3 py-1 font-mono text-xs text-verified hover:bg-verified/[0.06] disabled:opacity-50"
                      aria-describedby="feedback-prompt"
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      disabled={feedbackState === "submitting"}
                      onClick={() => void handleFeedback(false)}
                      className="a11y-control rounded border border-line px-3 py-1 font-mono text-xs text-ink/70 hover:bg-ink/[0.04] disabled:opacity-50"
                      aria-describedby="feedback-prompt"
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
