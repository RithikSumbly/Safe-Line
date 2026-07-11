import { useMemo } from "react";
import { buildSegments } from "@/lib/verdictFormat";
import { cn } from "@/lib/cn";
import type { AnnotatedVerdict } from "@/types/agent";
import { toSuperscript } from "@/types/agent";

const SEVERITY_COLORS = {
  risk: "text-risk decoration-risk",
  verified: "text-verified decoration-verified",
  pending: "text-pending decoration-pending",
} as const;

interface AnnotatedMessageBlockProps {
  verdict: AnnotatedVerdict;
  animate?: boolean;
  ready?: boolean;
  reducedMotion?: boolean;
  className?: string;
}

export function AnnotatedMessageBlock({
  verdict,
  animate = false,
  ready = true,
  reducedMotion = false,
  className,
}: AnnotatedMessageBlockProps) {
  const segments = useMemo(
    () => buildSegments(verdict.input_text, verdict.flagged_spans),
    [verdict.input_text, verdict.flagged_spans],
  );
  const showHighlights =
    verdict.flagged_spans.length > 0 && verdict.red_flags.length > 0;

  return (
    <div className={className}>
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
                    {animate && (
                      <span
                        className={cn(
                          "absolute bottom-0 left-0 h-0.5 w-full origin-left bg-alive",
                          ready &&
                            !reducedMotion &&
                            "animate-[underline-glow-draw_0.55s_ease-out_forwards]",
                        )}
                        style={{
                          animationDelay:
                            ready && !reducedMotion ? `${delay}s` : undefined,
                          transform: !ready ? "scaleX(0)" : undefined,
                        }}
                      />
                    )}
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
  );
}
