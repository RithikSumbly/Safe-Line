import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AnnotatedVerdictCard } from "@/components/AnnotatedVerdictCard";
import { Button } from "@/components/ui/button";
import { MOCK_VERDICTS } from "@/data/mockVerdicts";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import type { AnnotatedVerdict } from "@/types/agent";

const CYCLE_EXAMPLES = [
  MOCK_VERDICTS.scam,
  MOCK_VERDICTS.job_offer,
  MOCK_VERDICTS.crisis_rumor,
];

const CYCLE_MS = 6000;

export function HeroLiveDemo() {
  const reduced = usePrefersReducedMotion();
  const [displayText, setDisplayText] = useState("");
  const [mockVerdict, setMockVerdict] = useState<AnnotatedVerdict | null>(null);
  const [checkKey, setCheckKey] = useState(0);
  const [paused, setPaused] = useState(false);
  const typewriterRef = useRef<number | null>(null);
  const cycleRef = useRef<number | null>(null);

  const clearTimers = useCallback(() => {
    if (typewriterRef.current) {
      window.clearInterval(typewriterRef.current);
      typewriterRef.current = null;
    }
    if (cycleRef.current) {
      window.clearInterval(cycleRef.current);
      cycleRef.current = null;
    }
  }, []);

  const runTypewriter = useCallback(
    (full: string, onDone: () => void) => {
      if (reduced) {
        setDisplayText(full);
        onDone();
        return;
      }
      setDisplayText("");
      let i = 0;
      typewriterRef.current = window.setInterval(() => {
        i += 1;
        setDisplayText(full.slice(0, i));
        if (i >= full.length) {
          if (typewriterRef.current) clearInterval(typewriterRef.current);
          typewriterRef.current = null;
          onDone();
        }
      }, 12);
    },
    [reduced],
  );

  const showExample = useCallback(
    (idx: number) => {
      const example = CYCLE_EXAMPLES[idx];
      setMockVerdict(null);
      runTypewriter(example.input_text, () => {
        setMockVerdict(example);
        setCheckKey((k) => k + 1);
      });
    },
    [runTypewriter],
  );

  useEffect(() => {
    if (paused) {
      clearTimers();
      return;
    }

    let idx = 0;
    showExample(idx);

    cycleRef.current = window.setInterval(() => {
      idx = (idx + 1) % CYCLE_EXAMPLES.length;
      showExample(idx);
    }, CYCLE_MS);

    return clearTimers;
  }, [paused, showExample, clearTimers]);

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-12">
      <div>
        <p className="kicker">Live intake</p>
        <p className="mt-2 font-sans text-sm text-ink/55">
          Not sure about a bank SMS, job offer, or local rumour? Paste it in
          chat and SafeLine will verify it against live sources.
        </p>
        <div className="mt-4 rounded-[10px] border border-line bg-paper px-4 py-3 font-sans text-sm leading-relaxed text-ink/70 min-h-[120px]">
          {displayText || CYCLE_EXAMPLES[0].input_text}
        </div>
        <Button asChild className="mt-4">
          <Link to="/chat">Open SafeLine chat</Link>
        </Button>
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          className="ml-4 font-mono text-[10px] text-ink/40 underline underline-offset-4 hover:text-ink"
        >
          {paused ? "Resume preview" : "Pause preview"}
        </button>
      </div>

      <div className="min-h-[200px]">
        {mockVerdict && (
          <AnnotatedVerdictCard key={checkKey} verdict={mockVerdict} animate />
        )}
      </div>
    </div>
  );
}
