import { ChatComposer } from "@/components/chat/ChatComposer";
import { ChatSessionList } from "@/components/chat/ChatSessionList";
import { ChatThread } from "@/components/chat/ChatThread";
import { useChatSession } from "@/hooks/useChatSession";
import { useAuth } from "@/contexts/AuthContext";
import { CHAT_TAGLINE } from "@/lib/chatCopy";
import { cn } from "@/lib/cn";

export function ChatPage() {
  const { user } = useAuth();
  const {
    sessionId,
    messages,
    loading,
    error,
    sendMessage,
    startNewSession,
    loadSession,
  } = useChatSession();

  return (
    <div className="chat-page flex h-[calc(100svh-4rem)] min-h-0 flex-col overflow-hidden">
      <header className="shrink-0 border-b border-line px-4 py-4 md:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div>
            <p className="kicker">Live checker</p>
            <h1 className="font-display text-xl text-ink md:text-2xl">
              SafeLine chat
            </h1>
            <p className="mt-1 font-sans text-sm text-ink/55">{CHAT_TAGLINE}</p>
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 p-4 md:px-6">
        <div
          className={cn(
            "chat-workspace mx-auto flex h-full w-full max-w-6xl overflow-hidden rounded-lg border",
            !user && "max-w-4xl",
          )}
        >
          <ChatSessionList
            activeSessionId={sessionId}
            onSelect={loadSession}
            onNew={startNewSession}
          />
          <div className="flex min-w-0 flex-1 flex-col">
            <ChatThread messages={messages} loading={loading} />
            {error && (
              <p className="shrink-0 border-t border-risk/20 bg-risk/[0.05] px-4 py-2 font-sans text-sm text-risk">
                {error}
              </p>
            )}
            <ChatComposer onSend={sendMessage} loading={loading} />
          </div>
        </div>
      </div>
    </div>
  );
}
