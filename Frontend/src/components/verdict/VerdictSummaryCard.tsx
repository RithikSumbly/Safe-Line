import { cn } from "@/lib/cn";
import { riskScoreBarClass } from "@/lib/riskSemantics";
import type { AnnotatedVerdict } from "@/types/agent";
import { STATUS_STAMP, STATUS_SUMMARY } from "@/types/agent";

const STAMP_COLORS = {
  risk: "border-risk text-risk",
  verified: "border-verified text-verified",
  pending: "border-pending text-pending",
} as const;

interface VerdictSummaryCardProps {
  verdict: AnnotatedVerdict;
  onViewReport: () => void;
  className?: string;
}

export function VerdictSummaryCard({
  verdict,
  onViewReport,
  className,
}: VerdictSummaryCardProps) {
  const stamp = STATUS_STAMP[verdict.status];
  const teaser = verdict.red_flags[0];

  return (
    <article
      className={cn(
        "border border-line border-t-[3px] bg-paper",
        stamp.color === "risk" && "border-t-risk",
        stamp.color === "verified" && "border-t-verified",
        stamp.color === "pending" && "border-t-pending",
        className,
      )}
    >
      <div className="flex items-start gap-4 p-4">
        <div
          className={cn(
            "stamp-grain flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-4 border-double -rotate-[8deg] text-center",
            STAMP_COLORS[stamp.color],
          )}
          aria-label={`Verdict: ${stamp.label}`}
        >
          <span className="px-0.5 font-mono text-[8px] font-medium leading-tight tracking-wide">
            {stamp.label}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <p className="font-sans text-sm leading-relaxed text-ink/80">
            {STATUS_SUMMARY[verdict.status]}
          </p>
          {teaser && (
            <p className="mt-1 truncate font-sans text-xs text-ink/55">
              {teaser}
            </p>
          )}
          <div className="mt-3 flex items-center gap-3">
            <div className="flex items-baseline gap-1">
              <span className="font-display text-lg text-ink">
                {verdict.risk_score}
              </span>
              <span className="font-mono text-[10px] text-ink/40">/100</span>
            </div>
            <div className="h-1.5 flex-1 max-w-[120px] overflow-hidden rounded-full bg-line">
              <div
                className={cn("h-full", riskScoreBarClass(verdict.risk_score))}
                style={{ width: `${verdict.risk_score}%` }}
              />
            </div>
          </div>
          <button
            type="button"
            onClick={onViewReport}
            className="btn-cta mt-3 rounded px-4 py-2 font-sans text-sm"
          >
            View full report
          </button>
        </div>
      </div>
    </article>
  );
}
