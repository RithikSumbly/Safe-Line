import { useCallback, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { saveCheck } from "@/lib/checks";
import { checkContent } from "@/lib/checkContent";
import type { AgentType, AnnotatedVerdict } from "@/types/agent";

type CheckState = "idle" | "loading" | "done" | "error";

export function useContentCheck(agent: AgentType) {
  const { user } = useAuth();
  const [state, setState] = useState<CheckState>("idle");
  const [verdict, setVerdict] = useState<AnnotatedVerdict | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checkKey, setCheckKey] = useState(0);

  const runCheck = useCallback(
    async (input: Parameters<typeof checkContent>[1]) => {
      const hasFile = Boolean(input.file);
      if (!input.text.trim() && !hasFile) {
        setError("Paste some text or upload a document before checking.");
        setState("error");
        return;
      }
      setState("loading");
      setError(null);
      setVerdict(null);
      try {
        const result = await checkContent(agent, input);
        setVerdict(result);
        setCheckKey((k) => k + 1);
        setState("done");
        if (user) {
          saveCheck(user.id, agent, input.text, result).catch(() => {
            // History save failed silently — verdict still shown
          });
        }
      } catch {
        setError(
          "The check could not complete. Wait a moment and try again.",
        );
        setState("error");
      }
    },
    [agent, user],
  );

  return { state, verdict, error, checkKey, runCheck };
}
