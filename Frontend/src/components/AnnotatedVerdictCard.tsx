import { Check, ExternalLink, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { cn } from "@/lib/cn";
import type { AnnotatedVerdict, FlaggedSpan } from "@/types/agent";
import { STATUS_STAMP, toSuperscript } from "@/types/agent";

interface AnnotatedVerdictCardProps {
  verdict: AnnotatedVerdict;
  animate?: boolean;
  condensed?: boolean;
  className?: string;
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

export function AnnotatedVerdictCard({
  verdict,
  animate = true,
  condensed = false,
  className,
}: AnnotatedVerdictCardProps) {
  const reduced = usePrefersReducedMotion();
  const [ready, setReady] = useState(!animate);
  const [barReady, setBarReady] = useState(!animate);
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

        <div className="mb-6 pr-16">
          <p className="font-mono text-sm leading-relaxed text-ink whitespace-pre-wrap">
            {segments.map((seg, i) => {
              if (!seg.span) {
                return <span key={i}>{seg.text}</span>;
              }
              const delay = seg.span.tag * 0.12;
              return (
                <span key={i} className="relative inline">
                  <span
                    className={cn(
                      "relative inline pb-0.5",
                      SEVERITY_COLORS[seg.span.severity],
                    )}
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
                  stamp.color === "risk" && "bg-risk",
                  stamp.color === "verified" && "bg-verified",
                  stamp.color === "pending" && "bg-pending",
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
                className="h-full bg-ink/70 transition-[width] duration-[900ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] motion-reduce:transition-none"
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
          <p className="font-sans text-sm font-medium text-ink">
            {verdict.recommended_action}
          </p>
        </div>

        <p className="font-mono text-[11px] text-ink/40">{verdict.disclaimer}</p>
      </div>
    </article>
  );
}
