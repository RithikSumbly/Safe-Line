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

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-[12px] px-4 py-3 font-sans text-sm leading-relaxed",
          isUser
            ? "bg-ink text-paper"
            : message.messageType === "help"
              ? "border border-verified/30 bg-verified/[0.06] text-ink"
              : message.messageType === "clarification"
                ? "border border-pending/40 bg-pending/[0.08] text-ink"
                : message.messageType === "error"
                  ? "border border-risk/30 bg-risk/[0.06] text-ink"
                  : "border border-line bg-paper text-ink",
        )}
      >
        {message.content}
      </div>
    </div>
  );
}
