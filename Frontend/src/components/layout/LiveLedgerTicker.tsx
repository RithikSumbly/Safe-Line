import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import {
  LEDGER_SEED,
  nextLedgerItem,
  type LedgerFeedItem,
  type LedgerSeverity,
} from "@/data/liveLedgerFeed";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { ledgerLabelTextClass } from "@/lib/riskSemantics";
import { cn } from "@/lib/cn";

const DOT: Record<LedgerSeverity, string> = {
  risk: "bg-risk",
  verified: "bg-verified",
  pending: "bg-pending",
};

const LEDGER_STORAGE_KEY = "safeline-ledger-expanded";
const WIDE_BREAKPOINT = 1536;

function formatAgo(minutes: number): string {
  if (minutes < 1) return "just now";
  if (minutes === 1) return "1 min ago";
  return `${minutes} min ago`;
}

function readCollapsedDefault(): boolean {
  if (typeof window === "undefined") return true;
  const stored = sessionStorage.getItem(LEDGER_STORAGE_KEY);
  if (stored === "true") return false;
  if (stored === "false") return true;
  return window.innerWidth < WIDE_BREAKPOINT;
}

function FeedRow({
  item,
  isNew,
  index,
}: {
  item: LedgerFeedItem;
  isNew?: boolean;
  index: number;
}) {
  const useSansPrefix = index % 2 === 0;

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
      <p className="mt-1.5 text-[10px] leading-snug text-ink/75">
        {useSansPrefix && item.agent && (
          <span className="font-sans text-ink/50">{item.agent} · </span>
        )}
        <span className={cn("font-mono font-medium", ledgerLabelTextClass(item.severity))}>
          {item.label}
        </span>
        <span className="font-mono"> — {item.summary}</span>
      </p>
    </div>
  );
}

export function LiveLedgerTicker() {
  const reduced = usePrefersReducedMotion();
  const [items, setItems] = useState<LedgerFeedItem[]>(LEDGER_SEED.slice(0, 8));
  const [newId, setNewId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(readCollapsedDefault);

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

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      sessionStorage.setItem(LEDGER_STORAGE_KEY, String(!next));
      return next;
    });
  };

  if (collapsed) {
    return (
      <aside
        className="live-ledger hidden w-12 shrink-0 border-l border-line bg-paper/60 min-[1280px]:block"
        aria-label="Live ledger feed"
      >
        <div className="sticky top-0 flex h-svh flex-col items-center py-4">
          <button
            type="button"
            onClick={toggleCollapsed}
            className="flex flex-col items-center gap-3 rounded-[6px] p-2 text-ink/45 transition-colors hover:bg-ink/[0.04] hover:text-ink"
            aria-label="Expand live ledger"
            title="Live ledger"
          >
            <span className="relative flex h-2 w-2" aria-hidden>
              <span className="absolute inline-flex h-full w-full animate-alive-pulse rounded-full bg-alive opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-alive" />
            </span>
            <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
            <span
              className="font-mono text-[8px] uppercase tracking-widest [writing-mode:vertical-rl]"
            >
              Ledger
            </span>
          </button>
        </div>
      </aside>
    );
  }

  return (
    <aside
      className="live-ledger hidden w-[200px] shrink-0 border-l border-line bg-paper/60 min-[1280px]:block 2xl:w-[220px]"
      aria-label="Live ledger feed"
    >
      <div className="sticky top-0 flex h-svh flex-col">
        <div className="border-b border-line px-4 py-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2" aria-hidden>
                <span className="absolute inline-flex h-full w-full animate-alive-pulse rounded-full bg-alive opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-alive" />
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink/55">
                Live ledger
              </span>
            </div>
            <button
              type="button"
              onClick={toggleCollapsed}
              className="rounded p-1 text-ink/40 hover:bg-ink/5 hover:text-ink"
              aria-label="Collapse live ledger"
            >
              <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </div>
          <p className="mt-1 font-mono text-[9px] leading-relaxed text-ink/35">
            Recent anonymized filings
          </p>
        </div>

        <div className="relative flex-1 overflow-hidden">
          <div className="ledger-fade-mask h-full overflow-hidden px-3 pt-2">
            {items.map((item, index) => (
              <FeedRow
                key={item.id}
                item={item}
                isNew={item.id === newId}
                index={index}
              />
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}
