const API_BASE = import.meta.env.VITE_API_BASE_URL as string | undefined;

export async function submitFeedback(
  runId: string,
  helpful: boolean,
): Promise<void> {
  if (!API_BASE) {
    return;
  }
  const res = await fetch(`${API_BASE}/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ run_id: runId, helpful }),
  });
  if (!res.ok) {
    throw new Error("Feedback could not be saved");
  }
}
