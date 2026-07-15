import { useCountUp } from "@/hooks/useCountUp";
import { useInView } from "@/hooks/useInView";
import { cn } from "@/lib/cn";

interface StatsStripProps {
  className?: string;
}

export function StatsStrip({ className }: StatsStripProps) {
  const [ref, inView] = useInView<HTMLElement>(0.35);
  const messages = useCountUp(12847, inView);
  const scams = useCountUp(342, inView);

  return (
    <section
      ref={ref}
      className={cn(
        "border-y border-line bg-ink/[0.02] py-6",
        className,
      )}
      aria-label="Desk statistics"
    >
      <div className="content-shell">
        <div className="flex flex-wrap items-baseline justify-center gap-x-10 gap-y-3 text-center md:justify-start md:text-left">
          <p className="font-mono text-xs uppercase tracking-wider text-ink/70">
            <span className="font-display text-2xl font-semibold tabular-nums text-ink">
              {messages.toLocaleString("en-IN")}
            </span>{" "}
            messages checked
          </p>
          <span className="hidden h-4 w-px bg-line md:block" aria-hidden />
          <p className="font-mono text-xs uppercase tracking-wider text-ink/70">
            <span className="font-display text-2xl font-semibold tabular-nums text-risk">
              {scams.toLocaleString("en-IN")}
            </span>{" "}
            scams caught this week
          </p>
        </div>
      </div>
    </section>
  );
}
