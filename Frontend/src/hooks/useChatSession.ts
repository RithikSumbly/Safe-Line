import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { sendChatMessage } from "@/lib/chatApi";
import {
  createChatSession,
  getLocalSessionId,
  loadChatMessages,
  saveChatMessage,
  setLocalSessionId,
} from "@/lib/chatSessions";
import { saveCheck } from "@/lib/checks";
import type {
  ChatHistoryItem,
  ThreadMessage,
} from "@/types/agent";

function newId(): string {
  return crypto.randomUUID();
}

function toHistory(messages: ThreadMessage[]): ChatHistoryItem[] {
  return messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      role: m.role,
      content: m.verdict
        ? `${m.content}\n[Verdict: ${m.verdict.status}]`
        : m.content,
    }));
}

export function useChatSession() {
  const { user } = useAuth();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bootstrapped, setBootstrapped] = useState(false);

  const ensureSession = useCallback(
    async (firstMessage?: string): Promise<string> => {
      if (sessionId) return sessionId;
      if (user) {
        const id = await createChatSession(
          user.id,
          firstMessage?.slice(0, 80) ?? "New check",
        );
        setSessionId(id);
        setLocalSessionId(id);
        return id;
      }
      const local = getLocalSessionId() ?? newId();
      setSessionId(local);
      setLocalSessionId(local);
      return local;
    },
    [sessionId, user],
  );

  useEffect(() => {
    if (bootstrapped) return;
    const init = async () => {
      const stored = getLocalSessionId();
      if (user && stored) {
        try {
          const loaded = await loadChatMessages(stored);
          setSessionId(stored);
          setMessages(loaded);
        } catch {
          setSessionId(null);
        }
      } else if (stored && !user) {
        setSessionId(stored);
      }
      setBootstrapped(true);
    };
    void init();
  }, [user, bootstrapped]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      setLoading(true);
      setError(null);

      const userMsg: ThreadMessage = {
        id: newId(),
        role: "user",
        content: trimmed,
        messageType: "text",
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg]);

      try {
        const sid = await ensureSession(trimmed);
        const history = toHistory(messages);
        const response = await sendChatMessage(trimmed, sid, history);

        if (response.session_id !== sid) {
          setSessionId(response.session_id);
          setLocalSessionId(response.session_id);
        }

        if (user) {
          await saveChatMessage(sid, "user", trimmed, "text");
        }

        const assistantMsg: ThreadMessage = {
          id: newId(),
          role: "assistant",
          content: response.assistant_text,
          messageType: response.type,
          verdict: response.verdict ?? undefined,
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMsg]);

        if (user) {
          const persistType =
            response.type === "error" ? "text" : response.type;
          await saveChatMessage(
            response.session_id,
            "assistant",
            response.assistant_text,
            persistType,
            response.verdict ?? undefined,
          );
        }

        if (response.verdict && user) {
          saveCheck(user.id, response.verdict.agent, trimmed, response.verdict).catch(
            () => undefined,
          );
        }
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Something went wrong. Try again.",
        );
      } finally {
        setLoading(false);
      }
    },
    [loading, messages, ensureSession, user],
  );

  const startNewSession = useCallback(() => {
    const id = newId();
    setSessionId(id);
    setLocalSessionId(id);
    setMessages([]);
    setError(null);
  }, []);

  const loadSession = useCallback(
    async (id: string) => {
      setLocalSessionId(id);
      setSessionId(id);
      setError(null);
      if (user) {
        try {
          const loaded = await loadChatMessages(id);
          setMessages(loaded);
        } catch {
          setMessages([]);
        }
      } else {
        setMessages([]);
      }
    },
    [user],
  );

  return {
    sessionId,
    messages,
    loading,
    error,
    sendMessage,
    startNewSession,
    loadSession,
    bootstrapped,
  };
}
