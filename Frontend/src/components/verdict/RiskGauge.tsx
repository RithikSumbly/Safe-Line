import { cn } from "@/lib/cn";

interface RiskGaugeProps {
  score: number;
  className?: string;
}

function riskBand(score: number): string {
  if (score >= 70) return "High risk";
  if (score >= 40) return "Medium risk";
  return "Low risk";
}

export function RiskGauge({ score, className }: RiskGaugeProps) {
  const clamped = Math.max(0, Math.min(100, score));
  const band = riskBand(clamped);

  return (
    <div
      className={cn("space-y-2", className)}
      role="meter"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clamped}
      aria-valuetext={`${clamped} out of 100 — ${band}`}
      aria-label="Risk score"
    >
      <div className="flex items-baseline gap-1">
        <span className="font-display text-4xl font-medium text-ink" aria-hidden>
          {clamped}
        </span>
        <span className="font-mono text-sm text-ink/55" aria-hidden>
          /100
        </span>
        <span className="ml-2 font-mono text-xs font-medium uppercase tracking-wider text-ink">
          {band}
        </span>
      </div>
      <div className="relative h-3 w-full rounded-full bg-line/60" aria-hidden>
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              "linear-gradient(to right, var(--color-verified), var(--color-pending), var(--color-risk))",
          }}
        />
        <div
          className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-paper bg-ink shadow-sm"
          style={{ left: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
