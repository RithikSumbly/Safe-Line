import { cn } from "@/lib/cn";

interface RiskGaugeProps {
  score: number;
  className?: string;
}

export function RiskGauge({ score, className }: RiskGaugeProps) {
  const clamped = Math.max(0, Math.min(100, score));

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-baseline gap-1">
        <span className="font-display text-4xl font-medium text-ink">
          {clamped}
        </span>
        <span className="font-mono text-sm text-ink/45">/100</span>
      </div>
      <div className="relative h-3 w-full rounded-full bg-line/60">
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
          aria-hidden
        />
      </div>
    </div>
  );
}
