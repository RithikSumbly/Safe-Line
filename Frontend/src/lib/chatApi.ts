import { apiFetch } from "@/lib/apiClient";
import type {
  ChatHistoryItem,
  ChatMessageResponse,
} from "@/types/agent";

export async function sendChatMessage(
  text: string,
  sessionId: string | null,
  history: ChatHistoryItem[],
): Promise<ChatMessageResponse> {
  const res = await apiFetch("/chat/message", {
    method: "POST",
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
