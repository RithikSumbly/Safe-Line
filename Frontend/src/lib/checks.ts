import type { AgentType, AgentVerdict, AnnotatedVerdict } from "@/types/agent";
import { supabase } from "@/lib/supabase";

export interface SavedCheck {
  id: string;
  user_id: string;
  agent: AgentType;
  input_text: string | null;
  verdict: AgentVerdict;
  created_at: string;
}

function toAgentVerdict(verdict: AnnotatedVerdict): AgentVerdict {
  const { input_text: _t, flagged_spans: _f, ...agentVerdict } = verdict;
  return agentVerdict;
}

export async function saveCheck(
  userId: string,
  agent: AgentType,
  inputText: string,
  verdict: AnnotatedVerdict,
): Promise<void> {
  const { error } = await supabase.from("checks").insert({
    user_id: userId,
    agent,
    input_text: inputText,
    verdict: toAgentVerdict(verdict),
  });
  if (error) throw error;
}

export async function getUserChecks(
  userId: string,
  filters?: { agent?: AgentType; limit?: number },
): Promise<SavedCheck[]> {
  let query = supabase
    .from("checks")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(filters?.limit ?? 20);

  if (filters?.agent) {
    query = query.eq("agent", filters.agent);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as SavedCheck[];
}

export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("whatsapp_phone")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateWhatsAppPhone(
  userId: string,
  phone: string,
): Promise<void> {
  const { error } = await supabase.from("profiles").upsert({
    id: userId,
    whatsapp_phone: phone,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}
