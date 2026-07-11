import { useEffect, useRef } from "react";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { CheckingSourcesLoader } from "@/components/CheckingSourcesLoader";
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
        <h2 className="mt-2 font-display text-xl text-ink">
          Not sure if a message is real?
        </h2>
        <p className="mt-3 max-w-md font-sans text-sm text-ink/55">
          Bank alert, too-good job offer, or a dam-break rumour — paste or
          forward it here and we'll verify it against live sources.
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
