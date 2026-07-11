import type {
  ChatHistoryItem,
  ChatMessageResponse,
} from "@/types/agent";

const API_BASE = import.meta.env.VITE_API_BASE_URL as string | undefined;

export async function sendChatMessage(
  text: string,
  sessionId: string | null,
  history: ChatHistoryItem[],
): Promise<ChatMessageResponse> {
  if (!API_BASE) {
    throw new Error("Chat API is not configured. Set VITE_API_BASE_URL.");
  }
  const res = await fetch(`${API_BASE}/chat/message`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      session_id: sessionId,
      text,
      history,
    }),
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => null);
    throw new Error(
      (detail as { detail?: string } | null)?.detail ??
        "Chat request failed. Try again.",
    );
  }
  return res.json() as Promise<ChatMessageResponse>;
}
