import { apiFetch } from "@/lib/apiClient";

export async function submitFeedback(
  runId: string,
  helpful: boolean,
): Promise<void> {
  const res = await apiFetch("/feedback", {
    method: "POST",
    body: JSON.stringify({ run_id: runId, helpful }),
  });
  if (!res.ok) {
    throw new Error("Feedback could not be saved");
  }
}
