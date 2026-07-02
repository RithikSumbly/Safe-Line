import { useEffect, useState } from "react";
import {
  LEDGER_SEED,
  nextLedgerItem,
  type LedgerFeedItem,
  type LedgerSeverity,
} from "@/data/liveLedgerFeed";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { cn } from "@/lib/cn";

const DOT: Record<LedgerSeverity, string> = {
  risk: "bg-risk",
  verified: "bg-verified",
  pending: "bg-pending",
};

function formatAgo(minutes: number): string {
  if (minutes <= 0) return "just now";
  if (minutes === 1) return "1 min ago";
  return `${minutes} min ago`;
}

function FeedRow({ item }: { item: LedgerFeedItem }) {
  return (
    <li className="ledger-ticker-item border-b border-line/80 py-3 last:border-b-0">
      <time className="font-mono text-[9px] uppercase tracking-wider text-ink/35">
        {formatAgo(item.minutesAgo)}
      </time>
      <div className="mt-1.5 flex items-start gap-2">
        <span
          className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", DOT[item.severity])}
          aria-hidden
        />
        <p className="font-mono text-[10px] leading-snug text-ink/75">
          <span className="font-medium text-ink">{item.label}</span>
          {" — "}
          {item.summary}, checked {formatAgo(item.minutesAgo)}
        </p>
      </div>
    </li>
  );
}

export function LiveLedgerTicker() {
  const reduced = usePrefersReducedMotion();
  const [items, setItems] = useState<LedgerFeedItem[]>(LEDGER_SEED.slice(0, 8));

  useEffect(() => {
    const tick = () => {
      setItems((prev) => {
        const aged = prev.map((it) => ({
          ...it,
          minutesAgo: it.minutesAgo + 1,
        }));
        return [nextLedgerItem(), ...aged].slice(0, 10);
      });
    };

    const delay = reduced ? 12000 : 4500;
    const id = setInterval(tick, delay);
    return () => clearInterval(id);
  }, [reduced]);

  return (
    <aside
      className="fixed right-0 top-0 z-30 hidden h-svh w-[220px] flex-col border-l border-line bg-paper/90 px-4 pt-20 backdrop-blur-sm min-[1440px]:flex"
      aria-label="Live ledger feed"
    >
      <div className="mb-4 flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span
            className={cn(
              "absolute inline-flex h-full w-full rounded-full bg-alive opacity-75",
              !reduced && "animate-ping",
            )}
          />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-alive" />
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink/50">
          Live ledger
        </span>
      </div>

      <div className="relative flex-1 overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-16 bg-gradient-to-t from-paper to-transparent" />
        <ul className="ledger-ticker-list h-full overflow-hidden pr-1">
          {items.map((item) => (
            <FeedRow key={item.id} item={item} />
          ))}
        </ul>
      </div>
    </aside>
  );
}
