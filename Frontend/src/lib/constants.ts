export const LOADING_PHRASES = [
  "Checking sources…",
  "Cross-referencing reports…",
  "Reviewing cited records…",
] as const;

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
