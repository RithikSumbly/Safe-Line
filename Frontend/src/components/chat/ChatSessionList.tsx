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
    if (!window.confirm("Delete this session? This cannot be undone.")) return;
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
      aria-label="Chat sessions"
    >
      <div className="flex shrink-0 flex-col gap-3 border-b border-[var(--chat-border)] p-4">
        <h2 className="kicker">Sessions</h2>
        <button
          type="button"
          onClick={onNew}
          className="btn-cta a11y-control inline-flex h-11 w-full items-center justify-center rounded-[6px] font-sans text-sm font-medium"
        >
          + New session
        </button>
      </div>

      {sessions.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <Inbox className="mb-3 h-9 w-9 text-ink/40" strokeWidth={1.25} aria-hidden />
          <p className="font-sans text-sm text-ink/65">No saved checks yet</p>
          <p className="mt-1 font-sans text-xs text-ink/55">Start one below</p>
        </div>
      ) : (
        <ul className="flex-1 overflow-y-auto p-2" aria-label="Saved sessions">
          {sessions.map((s) => {
            const title = s.title || "Untitled check";
            const active = activeSessionId === s.id;
            return (
              <li key={s.id} className="group relative mb-1">
                {editingId === s.id ? (
                  <div>
                    <label htmlFor={`rename-${s.id}`} className="sr-only">
                      Rename session
                    </label>
                    <input
                      id={`rename-${s.id}`}
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
                  </div>
                ) : (
                  <div
                    className={cn(
                      "flex items-stretch gap-1 rounded-[8px] border",
                      active
                        ? "nav-session-active text-ink"
                        : "border-transparent text-ink/65 hover:border-[var(--chat-border)] hover:bg-ink/[0.03] hover:text-ink",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => onSelect(s.id)}
                      className="min-h-11 flex-1 px-3 py-2.5 text-left transition-colors"
                      aria-current={active ? "true" : undefined}
                    >
                      <span className="block truncate font-sans text-xs font-medium">
                        {title}
                      </span>
                      <span className="mt-0.5 block font-mono text-[9px] text-ink/55">
                        {formatRelativeTime(s.updatedAt)}
                      </span>
                    </button>
                    <div className="flex shrink-0 items-center gap-0.5 pr-1 opacity-100 sm:opacity-0 sm:focus-within:opacity-100 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                      <button
                        type="button"
                        onClick={(e) => startRename(s, e)}
                        className="a11y-control rounded p-2 text-ink/55 hover:bg-ink/5 hover:text-ink"
                        aria-label={`Rename session ${title}`}
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => void handleDelete(s.id, e)}
                        className="a11y-control rounded p-2 text-ink/55 hover:bg-risk/10 hover:text-risk"
                        aria-label={`Delete session ${title}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden />
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}
