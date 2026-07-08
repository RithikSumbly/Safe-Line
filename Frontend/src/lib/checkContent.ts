import { getMockVerdict } from "@/data/mockVerdicts";
import { delay } from "@/lib/constants";
import type { AgentType, AnnotatedVerdict, CheckInput } from "@/types/agent";

const API_BASE = import.meta.env.VITE_API_BASE_URL as string | undefined;

function serializeInput(input: CheckInput): Record<string, string> {
  const body: Record<string, string> = { text: input.text };
  if (input.url) body.url = input.url;
  if (input.email) body.email = input.email;
  if (input.location) body.location = input.location;
  if (input.jurisdiction) body.jurisdiction = input.jurisdiction;
  if (input.fileName) body.fileName = input.fileName;
  return body;
}

export async function checkContent(
  agent: AgentType,
  input: CheckInput,
): Promise<AnnotatedVerdict> {
  if (!API_BASE) {
    await delay(1500);
    return getMockVerdict(agent, input);
  }

  const res = await fetch(`${API_BASE}/agents/${agent}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(serializeInput(input)),
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => null);
    throw new Error(
      (detail as { detail?: string } | null)?.detail ??
        "Check failed. Try again in a moment.",
    );
  }
  return res.json() as Promise<AnnotatedVerdict>;
}
