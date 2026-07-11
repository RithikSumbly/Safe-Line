import { useEffect, useRef } from "react";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { CheckingSourcesLoader } from "@/components/CheckingSourcesLoader";
import {
  CHAT_EMPTY_BLURB,
  CHAT_EMPTY_TITLE,
  WELCOME_MESSAGE_ID,
} from "@/lib/chatCopy";
import type { ThreadMessage } from "@/types/agent";

interface ChatThreadProps {
  messages: ThreadMessage[];
  loading: boolean;
}

export function ChatThread({ messages, loading }: ChatThreadProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(messages.length);

  const hasUserMessages = messages.some((m) => m.role === "user");
  const displayMessages = messages.filter((m) => m.id !== WELCOME_MESSAGE_ID);

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
      {!hasUserMessages ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-8 text-center">
          <h2 className="font-display text-lg text-ink md:text-xl">
            {CHAT_EMPTY_TITLE}
          </h2>
          <p className="mt-2 max-w-sm whitespace-pre-line font-sans text-sm leading-relaxed text-ink/55">
            {CHAT_EMPTY_BLURB}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-5 px-4 py-6 md:px-6">
          {displayMessages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} />
          ))}
          {loading && <CheckingSourcesLoader className="max-w-md" />}
        </div>
      )}
    </div>
  );
}
