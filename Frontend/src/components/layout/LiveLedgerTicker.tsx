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
  if (minutes < 1) return "just now";
  if (minutes === 1) return "1 min ago";
  return `${minutes} min ago`;
}

function FeedRow({ item, isNew }: { item: LedgerFeedItem; isNew?: boolean }) {
  return (
    <div
      className={cn(
        "border-b border-line/80 py-3 pl-1 pr-2",
        isNew && "animate-ledger-slide-in",
      )}
    >
      <div className="flex items-center gap-2">
        <span
          className={cn("h-1.5 w-1.5 shrink-0 rounded-full", DOT[item.severity])}
          aria-hidden
        />
        <span className="font-mono text-[9px] uppercase tracking-wider text-ink/35">
          {formatAgo(item.minutesAgo)}
        </span>
      </div>
      <p className="mt-1.5 font-mono text-[10px] leading-snug text-ink/75">
        <span
          className={cn(
            "font-medium",
            item.severity === "risk" && "text-risk",
            item.severity === "verified" && "text-verified",
            item.severity === "pending" && "text-pending",
          )}
        >
          {item.label}
        </span>
        {" — "}
        {item.summary}, checked {formatAgo(item.minutesAgo)}
      </p>
    </div>
  );
}

export function LiveLedgerTicker() {
  const reduced = usePrefersReducedMotion();
  const [items, setItems] = useState<LedgerFeedItem[]>(LEDGER_SEED.slice(0, 8));
  const [newId, setNewId] = useState<string | null>(null);

  useEffect(() => {
    const tick = () => {
      setItems((prev) => {
        const aged = prev.map((item) => ({
          ...item,
          minutesAgo: item.minutesAgo + 1,
        }));
        const incoming = nextLedgerItem();
        setNewId(incoming.id);
        return [incoming, ...aged].slice(0, 12);
      });
    };

    const interval = reduced ? null : window.setInterval(tick, 4500);
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [reduced]);

  return (
    <aside
      className="live-ledger hidden w-[200px] shrink-0 border-l border-line bg-paper/60 min-[1440px]:block 2xl:w-[220px]"
      aria-label="Live ledger feed"
    >
      <div className="sticky top-0 flex h-svh flex-col">
        <div className="border-b border-line px-4 py-4">
          <div className="flex items-center gap-2">
            <span
              className="relative flex h-2 w-2"
              aria-hidden
            >
              <span className="absolute inline-flex h-full w-full animate-alive-pulse rounded-full bg-alive opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-alive" />
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink/55">
              Live ledger
            </span>
          </div>
          <p className="mt-1 font-mono text-[9px] leading-relaxed text-ink/35">
            Recent anonymized filings
          </p>
        </div>

        <div className="relative flex-1 overflow-hidden">
          <div className="ledger-fade-mask h-full overflow-hidden px-3 pt-2">
            {items.map((item) => (
              <FeedRow
                key={item.id}
                item={item}
                isNew={item.id === newId}
              />
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}
