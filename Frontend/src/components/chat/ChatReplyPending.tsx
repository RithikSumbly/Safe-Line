import { cn } from "@/lib/cn";

interface ChatReplyPendingProps {
  className?: string;
}

/** Lightweight pending state for greetings / Q&A — not a live source check. */
export function ChatReplyPending({ className }: ChatReplyPendingProps) {
  return (
    <div
      className={cn(
        "inline-flex max-w-md items-center gap-2 rounded-[12px] border border-line bg-paper px-4 py-3",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-label="Replying"
    >
      <span className="flex items-center gap-1" aria-hidden>
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink/45 [animation-delay:0ms]" />
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink/45 [animation-delay:150ms]" />
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink/45 [animation-delay:300ms]" />
      </span>
      <span className="font-sans text-sm text-ink/55">Replying…</span>
    </div>
  );
}
