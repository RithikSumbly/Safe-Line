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
import {
  cacheSessionImage,
  clearCachedSessionImages,
  readCachedSessionImages,
} from "@/lib/chatImageCache";
import { createWelcomeMessage, WELCOME_MESSAGE_ID } from "@/lib/chatCopy";
import { looksLikeLiveCheck, type PendingKind } from "@/lib/chatIntent";
import { saveCheck } from "@/lib/checks";
import type {
  ChatHistoryItem,
  ThreadMessage,
} from "@/types/agent";

export interface ChatSendPayload {
  text: string;
  imageDataUrl?: string;
  imageBase64?: string;
  imageMimeType?: string;
}

function newId(): string {
  return crypto.randomUUID();
}

function toHistory(messages: ThreadMessage[]): ChatHistoryItem[] {
  return messages
    .filter(
      (m) =>
        (m.role === "user" || m.role === "assistant") &&
        m.id !== WELCOME_MESSAGE_ID,
    )
    .map((m) => ({
      role: m.role,
      content: m.verdict
        ? `${m.content}\n[Verdict: ${m.verdict.status}]`
        : m.content || (m.imageDataUrl ? "[User sent a screenshot]" : ""),
    }));
}

function initialMessages(loaded: ThreadMessage[]): ThreadMessage[] {
  const hasWelcome = loaded.some((m) => m.id === WELCOME_MESSAGE_ID);
  if (loaded.length === 0) return [createWelcomeMessage()];
  if (!hasWelcome) return [createWelcomeMessage(), ...loaded];
  return loaded;
}

function hydrateCachedImages(
  sessionId: string,
  msgs: ThreadMessage[],
): ThreadMessage[] {
  const cached = readCachedSessionImages(sessionId);
  if (!Object.keys(cached).length) return msgs;
  return msgs.map((m) =>
    m.imageDataUrl || !cached[m.id]
      ? m
      : { ...m, imageDataUrl: cached[m.id] },
  );
}

export function useChatSession() {
  const { user } = useAuth();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ThreadMessage[]>([createWelcomeMessage()]);
  const [pendingKind, setPendingKind] = useState<PendingKind>("idle");
  const [error, setError] = useState<string | null>(null);
  const [bootstrapped, setBootstrapped] = useState(false);

  const loading = pendingKind !== "idle";

  const ensureSession = useCallback(
    async (firstMessage?: string): Promise<string> => {
      if (sessionId) return sessionId;
      if (user) {
        const id = await createChatSession(
          user.id,
          firstMessage?.slice(0, 80) || "Screenshot check",
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
          setMessages(
            hydrateCachedImages(stored, initialMessages(loaded)),
          );
        } catch {
          setSessionId(null);
          setMessages([createWelcomeMessage()]);
        }
      } else if (stored && !user) {
        setSessionId(stored);
        setMessages([createWelcomeMessage()]);
      }
      setBootstrapped(true);
    };
    void init();
  }, [user, bootstrapped]);

  const sendMessage = useCallback(
    async (payload: ChatSendPayload | string) => {
      const opts: ChatSendPayload =
        typeof payload === "string" ? { text: payload } : payload;
      const trimmed = opts.text.trim();
      const hasImage = Boolean(opts.imageBase64 && opts.imageDataUrl);
      if ((!trimmed && !hasImage) || loading) return;

      const kind: PendingKind = looksLikeLiveCheck(trimmed, hasImage)
        ? "check"
        : "reply";
      setPendingKind(kind);
      setError(null);

      // Image is the message; optional caption sits under it — no emoji placeholder.
      const displayContent = trimmed;
      const messageId = newId();

      const userMsg: ThreadMessage = {
        id: messageId,
        role: "user",
        content: displayContent,
        messageType: "text",
        createdAt: new Date().toISOString(),
        imageDataUrl: opts.imageDataUrl,
      };
      setMessages((prev) => [...prev, userMsg]);

      try {
        const sid = await ensureSession(
          trimmed || (hasImage ? "Screenshot" : "New check"),
        );
        if (opts.imageDataUrl) {
          cacheSessionImage(sid, messageId, opts.imageDataUrl);
        }

        const history = toHistory(messages);
        const response = await sendChatMessage({
          text: trimmed,
          sessionId: sid,
          history,
          imageBase64: opts.imageBase64,
          imageMimeType: opts.imageMimeType,
        });

        if (response.session_id !== sid) {
          setSessionId(response.session_id);
          setLocalSessionId(response.session_id);
        }

        const assistantMsg: ThreadMessage = {
          id: newId(),
          role: "assistant",
          content: response.assistant_text,
          messageType: response.type,
          verdict: response.verdict ?? undefined,
          runId: response.run_id ?? undefined,
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMsg]);

        if (user) {
          const persistType =
            response.type === "error" ? "text" : response.type;
          try {
            await saveChatMessage(
              sid,
              "user",
              displayContent,
              "text",
              undefined,
              opts.imageDataUrl,
            );
            await saveChatMessage(
              response.session_id,
              "assistant",
              response.assistant_text,
              persistType,
              response.verdict ?? undefined,
            );
          } catch (persistErr) {
            console.warn("Chat history save failed:", persistErr);
          }
        }

        if (response.verdict && user) {
          saveCheck(
            user.id,
            response.verdict.agent,
            trimmed || "[Screenshot]",
            response.verdict,
          ).catch(() => undefined);
        }
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Something went wrong. Try again.",
        );
      } finally {
        setPendingKind("idle");
      }
    },
    [loading, messages, ensureSession, user],
  );

  const startNewSession = useCallback(() => {
    const prev = getLocalSessionId();
    if (prev) clearCachedSessionImages(prev);
    setSessionId(null);
    localStorage.removeItem("safeline_chat_session_id");
    setMessages([createWelcomeMessage()]);
    setError(null);
    setPendingKind("idle");
  }, []);

  const loadSession = useCallback(
    async (id: string) => {
      setLocalSessionId(id);
      setSessionId(id);
      setError(null);
      setPendingKind("idle");
      if (user) {
        try {
          const loaded = await loadChatMessages(id);
          setMessages(hydrateCachedImages(id, initialMessages(loaded)));
        } catch {
          setMessages([createWelcomeMessage()]);
        }
      } else {
        setMessages([createWelcomeMessage()]);
      }
    },
    [user],
  );

  return {
    sessionId,
    messages,
    loading,
    pendingKind,
    error,
    sendMessage,
    startNewSession,
    loadSession,
    bootstrapped,
  };
}
