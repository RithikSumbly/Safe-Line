import { apiFetch } from "@/lib/apiClient";
import type {
  ChatHistoryItem,
  ChatMessageResponse,
} from "@/types/agent";

export interface SendChatOptions {
  text: string;
  sessionId: string | null;
  history: ChatHistoryItem[];
  imageBase64?: string;
  imageMimeType?: string;
}

export async function sendChatMessage(
  opts: SendChatOptions,
): Promise<ChatMessageResponse> {
  const body: Record<string, unknown> = {
    session_id: opts.sessionId,
    text: opts.text,
    history: opts.history,
  };
  if (opts.imageBase64) {
    body.image_base64 = opts.imageBase64;
    body.image_mime_type = opts.imageMimeType ?? "image/jpeg";
  }

  const res = await apiFetch("/chat/message", {
    method: "POST",
    body: JSON.stringify(body),
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
