import { useEffect, useRef } from "react";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { CheckingSourcesLoader } from "@/components/CheckingSourcesLoader";
import { CHAT_EMPTY_BLURB, CHAT_EMPTY_TITLE } from "@/lib/chatCopy";
import type { ThreadMessage } from "@/types/agent";

interface ChatThreadProps {
  messages: ThreadMessage[];
  loading: boolean;
}

export function ChatThread({ messages, loading }: ChatThreadProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  if (messages.length === 0 && !loading) {
    return (
      <div className="flex min-h-[240px] max-h-[320px] flex-1 flex-col items-center justify-center px-6 text-center">
        <h2 className="font-display text-lg text-ink md:text-xl">
          {CHAT_EMPTY_TITLE}
        </h2>
        <p className="mt-2 max-w-sm whitespace-pre-line font-sans text-sm leading-relaxed text-ink/55">
          {CHAT_EMPTY_BLURB}
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 md:px-6">
      <div className="mx-auto flex max-w-3xl flex-col gap-5">
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
        {loading && <CheckingSourcesLoader className="max-w-md" />}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
