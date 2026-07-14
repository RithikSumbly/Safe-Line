import { VerdictSummaryCard } from "@/components/verdict/VerdictSummaryCard";
import { cn } from "@/lib/cn";
import type { ThreadMessage } from "@/types/agent";

interface ChatMessageProps {
  message: ThreadMessage;
  onOpenReport?: (messageId: string) => void;
}

export function ChatMessage({ message, onOpenReport }: ChatMessageProps) {
  const isUser = message.role === "user";

  if (message.verdict) {
    return (
      <div className="flex justify-start">
        <div className="max-w-full w-full space-y-3">
          {message.content && (
            <p className="max-w-[90%] font-sans text-sm text-ink/70">
              {message.content}
            </p>
          )}
          <VerdictSummaryCard
            verdict={message.verdict}
            onViewReport={() => onOpenReport?.(message.id)}
          />
        </div>
      </div>
    );
  }

  const imageOnly = Boolean(message.imageDataUrl) && !message.content.trim();

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] space-y-2 font-sans text-sm leading-relaxed",
          imageOnly
            ? "overflow-hidden rounded-[12px]"
            : "rounded-[12px] px-4 py-3",
          !imageOnly &&
            (isUser
              ? "bg-ink text-paper"
              : message.messageType === "help"
                ? "border border-verified/30 bg-verified/[0.06] text-ink"
                : message.messageType === "clarification"
                  ? "border border-pending/40 bg-pending/[0.08] text-ink"
                  : message.messageType === "error"
                    ? "border border-risk/30 bg-risk/[0.06] text-ink"
                    : "border border-line bg-paper text-ink"),
          imageOnly && isUser && "bg-ink p-1.5",
          imageOnly && !isUser && "border border-line bg-paper p-1.5",
        )}
      >
        {message.imageDataUrl && (
          <img
            src={message.imageDataUrl}
            alt="Sent screenshot"
            className={cn(
              "max-h-64 max-w-full rounded-md object-contain",
              !imageOnly && isUser && "ring-1 ring-paper/20",
              !imageOnly && !isUser && "border border-line",
            )}
          />
        )}
        {message.content.trim() && (
          <p
            className={cn(
              "whitespace-pre-wrap",
              imageOnly ? "px-2.5 pb-2 pt-1" : undefined,
            )}
          >
            {message.content}
          </p>
        )}
      </div>
    </div>
  );
}
