import { AnnotatedVerdictCard } from "@/components/AnnotatedVerdictCard";
import { CheckingSourcesLoader } from "@/components/CheckingSourcesLoader";
import type { AnnotatedVerdict } from "@/types/agent";

interface ResultPanelProps {
  state: "idle" | "loading" | "done" | "error";
  verdict: AnnotatedVerdict | null;
  error: string | null;
  checkKey: number;
  emptyMessage?: string;
}

export function ResultPanel({
  state,
  verdict,
  error,
  checkKey,
  emptyMessage = "Paste a message above and press Check this to see a cited verdict here.",
}: ResultPanelProps) {
  if (state === "idle") {
    return (
      <div className="flex h-full min-h-[280px] items-center justify-center border border-dashed border-line bg-ink/[0.02] px-6">
        <p className="text-center font-mono text-xs leading-relaxed text-ink/50">
          {emptyMessage}
        </p>
      </div>
    );
  }

  if (state === "loading") {
    return <CheckingSourcesLoader className="h-full min-h-[280px]" />;
  }

  if (state === "error" && error) {
    return (
      <div className="border border-risk/30 rounded-[12px] bg-risk/5 p-6">
        <p className="font-sans text-sm text-ink">{error}</p>
      </div>
    );
  }

  if (verdict) {
    return (
      <AnnotatedVerdictCard
        key={checkKey}
        verdict={verdict}
        animate
      />
    );
  }

  return null;
}
