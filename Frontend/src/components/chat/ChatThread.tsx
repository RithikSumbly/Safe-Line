import { useEffect, useRef } from "react";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { CheckingSourcesLoader } from "@/components/CheckingSourcesLoader";
import { CHAT_EMPTY_TITLE, HELP_TEXT } from "@/lib/chatCopy";
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
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <p className="kicker">SafeLine chat</p>
        <h2 className="mt-2 font-display text-xl text-ink">{CHAT_EMPTY_TITLE}</h2>
        <p className="mt-3 max-w-md whitespace-pre-line font-sans text-sm leading-relaxed text-ink/55">
          {HELP_TEXT}
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
