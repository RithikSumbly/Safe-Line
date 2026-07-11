import { useEffect, useMemo, useRef } from "react";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { CheckingSourcesLoader } from "@/components/CheckingSourcesLoader";
import {
  CHAT_EMPTY_BLURB,
  CHAT_EMPTY_TITLE,
  WELCOME_MESSAGE_ID,
} from "@/lib/chatCopy";
import { cn } from "@/lib/cn";
import type { ThreadMessage } from "@/types/agent";

interface ChatThreadProps {
  messages: ThreadMessage[];
  loading: boolean;
  onOpenReport?: (messageId: string) => void;
}

export function ChatThread({ messages, loading, onOpenReport }: ChatThreadProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(messages.length);

  const welcomeMessage = useMemo(
    () => messages.find((m) => m.id === WELCOME_MESSAGE_ID),
    [messages],
  );
  const conversationMessages = useMemo(
    () => messages.filter((m) => m.id !== WELCOME_MESSAGE_ID),
    [messages],
  );
  const hasUserMessages = conversationMessages.some((m) => m.role === "user");

  useEffect(() => {
    if (!hasUserMessages) return;
    const el = scrollRef.current;
    if (!el) return;
    const grew = messages.length > prevCountRef.current || loading;
    prevCountRef.current = messages.length;
    if (grew) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, loading, hasUserMessages]);

  return (
    <div
      ref={scrollRef}
      className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain"
    >
      <div
        className={cn(
          "flex flex-col gap-5 px-4 py-6 md:px-6",
          !hasUserMessages && "min-h-full flex-1 justify-center",
        )}
      >
        {!hasUserMessages ? (
          welcomeMessage ? (
            <div className="mx-auto max-w-md">
              <ChatMessage message={welcomeMessage} onOpenReport={onOpenReport} />
            </div>
          ) : (
            <div className="text-center">
              <h2 className="font-display text-lg text-ink md:text-xl">
                {CHAT_EMPTY_TITLE}
              </h2>
              <p className="mx-auto mt-2 max-w-sm whitespace-pre-line font-sans text-sm leading-relaxed text-ink/55">
                {CHAT_EMPTY_BLURB}
              </p>
            </div>
          )
        ) : (
          <>
            {welcomeMessage && (
              <ChatMessage message={welcomeMessage} onOpenReport={onOpenReport} />
            )}
            {conversationMessages.map((msg) => (
              <ChatMessage
                key={msg.id}
                message={msg}
                onOpenReport={onOpenReport}
              />
            ))}
            {loading && <CheckingSourcesLoader className="max-w-md" />}
          </>
        )}
      </div>
    </div>
  );
}
