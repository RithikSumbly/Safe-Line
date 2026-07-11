import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { listChatSessions } from "@/lib/chatSessions";
import { cn } from "@/lib/cn";
import type { ChatSession } from "@/types/agent";

interface ChatSessionListProps {
  activeSessionId: string | null;
  onSelect: (sessionId: string) => void;
  onNew: () => void;
  className?: string;
}

export function ChatSessionList({
  activeSessionId,
  onSelect,
  onNew,
  className,
}: ChatSessionListProps) {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<ChatSession[]>([]);

  useEffect(() => {
    if (!user) return;
    listChatSessions(user.id)
      .then(setSessions)
      .catch(() => setSessions([]));
  }, [user, activeSessionId]);

  if (!user) return null;

  return (
    <aside
      className={cn(
        "hidden w-52 shrink-0 border-r border-line bg-paper/60 lg:block",
        className,
      )}
    >
      <div className="flex items-center justify-between border-b border-line px-3 py-3">
        <span className="kicker">Sessions</span>
        <button
          type="button"
          onClick={onNew}
          className="rounded-[6px] p-1 text-ink/50 hover:bg-ink/5 hover:text-ink"
          aria-label="New chat"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
      <ul className="max-h-[calc(100vh-8rem)] overflow-y-auto p-2">
        {sessions.map((s) => (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => onSelect(s.id)}
              className={cn(
                "w-full rounded-[8px] px-3 py-2 text-left font-sans text-xs transition-colors",
                activeSessionId === s.id
                  ? "bg-alive/15 text-ink"
                  : "text-ink/55 hover:bg-ink/5 hover:text-ink",
              )}
            >
              {s.title || "Untitled check"}
            </button>
          </li>
        ))}
        {sessions.length === 0 && (
          <li className="px-3 py-4 font-mono text-[10px] text-ink/40">
            No saved sessions yet
          </li>
        )}
      </ul>
    </aside>
  );
}
