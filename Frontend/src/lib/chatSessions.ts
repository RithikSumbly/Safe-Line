import { supabase } from "@/lib/supabase";
import type {
  AnnotatedVerdict,
  ChatMessageType,
  ChatRole,
  ChatSession,
  ThreadMessage,
} from "@/types/agent";

const SESSION_KEY = "safeline_chat_session_id";

export function getLocalSessionId(): string | null {
  return localStorage.getItem(SESSION_KEY);
}

export function setLocalSessionId(id: string): void {
  localStorage.setItem(SESSION_KEY, id);
}

export async function createChatSession(
  userId: string,
  title: string,
): Promise<string> {
  const { data, error } = await supabase
    .from("chat_sessions")
    .insert({ user_id: userId, title: title.slice(0, 80) })
    .select("id")
    .single();
  if (error || !data) throw error ?? new Error("Failed to create session");
  return data.id as string;
}

export async function listChatSessions(userId: string): Promise<ChatSession[]> {
  const { data, error } = await supabase
    .from("chat_sessions")
    .select("id, title, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(20);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id as string,
    title: row.title as string | null,
    updatedAt: row.updated_at as string,
  }));
}

export async function loadChatMessages(
  sessionId: string,
): Promise<ThreadMessage[]> {
  const { data, error } = await supabase
    .from("chat_messages")
    .select("id, role, content, message_type, verdict, created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id as string,
    role: row.role as ChatRole,
    content: (row.content as string) ?? "",
    messageType: row.message_type as ChatMessageType,
    verdict: row.verdict as AnnotatedVerdict | undefined,
    createdAt: row.created_at as string,
  }));
}

export async function saveChatMessage(
  sessionId: string,
  role: ChatRole,
  content: string,
  messageType: ChatMessageType,
  verdict?: AnnotatedVerdict,
): Promise<void> {
  const { error } = await supabase.from("chat_messages").insert({
    session_id: sessionId,
    role,
    content,
    message_type: messageType,
    verdict: verdict ?? null,
    agent: verdict?.agent ?? null,
  });
  if (error) throw error;
  await supabase
    .from("chat_sessions")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", sessionId);
}

export async function deleteChatSession(sessionId: string): Promise<void> {
  const { error } = await supabase
    .from("chat_sessions")
    .delete()
    .eq("id", sessionId);
  if (error) throw error;
}

export async function renameChatSession(
  sessionId: string,
  title: string,
): Promise<void> {
  const { error } = await supabase
    .from("chat_sessions")
    .update({
      title: title.slice(0, 80),
      updated_at: new Date().toISOString(),
    })
    .eq("id", sessionId);
  if (error) throw error;
}
