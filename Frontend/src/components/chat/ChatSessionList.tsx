import { useCallback, useEffect, useState } from "react";
import { Inbox, Pencil, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  deleteChatSession,
  listChatSessions,
  renameChatSession,
} from "@/lib/chatSessions";
import { formatRelativeTime } from "@/lib/formatRelativeTime";
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const refresh = useCallback(() => {
    if (!user) return;
    listChatSessions(user.id)
      .then(setSessions)
      .catch(() => setSessions([]));
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh, activeSessionId]);

  const handleDelete = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Delete this session?")) return;
    try {
      await deleteChatSession(sessionId);
      if (activeSessionId === sessionId) onNew();
      refresh();
    } catch {
      // ignore
    }
  };

  const startRename = (session: ChatSession, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(session.id);
    setEditTitle(session.title || "Untitled check");
  };

  const commitRename = async (sessionId: string) => {
    const trimmed = editTitle.trim();
    setEditingId(null);
    if (!trimmed) return;
    try {
      await renameChatSession(sessionId, trimmed);
      refresh();
    } catch {
      // ignore
    }
  };

  if (!user) return null;

  return (
    <aside
      className={cn(
        "chat-workspace-divider hidden h-full w-[280px] shrink-0 flex-col border-r lg:flex",
        className,
      )}
    >
      <div className="flex shrink-0 flex-col gap-3 border-b border-[var(--chat-border)] p-4">
        <span className="kicker">Sessions</span>
        <button
          type="button"
          onClick={onNew}
          className="btn-cta inline-flex h-9 w-full items-center justify-center rounded-[6px] font-sans text-sm font-medium"
        >
          + New session
        </button>
      </div>

      {sessions.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <Inbox className="mb-3 h-9 w-9 text-ink/25" strokeWidth={1.25} />
          <p className="font-sans text-sm text-ink/55">No saved checks yet</p>
          <p className="mt-1 font-sans text-xs text-ink/40">Start one below</p>
        </div>
      ) : (
        <ul className="flex-1 overflow-y-auto p-2">
          {sessions.map((s) => (
            <li key={s.id} className="group relative mb-1">
              {editingId === s.id ? (
                <input
                  autoFocus
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onBlur={() => void commitRename(s.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void commitRename(s.id);
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  className="w-full rounded-[8px] border border-[var(--chat-border)] bg-[var(--chat-panel-bg)] px-3 py-2 font-sans text-xs text-ink outline-none ring-2 ring-[var(--color-cta)] ring-offset-1"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => onSelect(s.id)}
                  className={cn(
                    "w-full rounded-[8px] border px-3 py-2.5 text-left transition-colors",
                    activeSessionId === s.id
                      ? "nav-session-active text-ink"
                      : "border-transparent text-ink/55 hover:border-[var(--chat-border)] hover:bg-ink/[0.03] hover:text-ink",
                  )}
                >
                  <span className="block truncate pr-14 font-sans text-xs font-medium">
                    {s.title || "Untitled check"}
                  </span>
                  <span className="mt-0.5 block font-mono text-[9px] text-ink/40">
                    {formatRelativeTime(s.updatedAt)}
                  </span>
                </button>
              )}
              {editingId !== s.id && (
                <div className="absolute right-2 top-2 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={(e) => startRename(s, e)}
                    className="rounded p-1 text-ink/40 hover:bg-ink/5 hover:text-ink"
                    aria-label="Rename session"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => void handleDelete(s.id, e)}
                    className="rounded p-1 text-ink/40 hover:bg-risk/10 hover:text-risk"
                    aria-label="Delete session"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
