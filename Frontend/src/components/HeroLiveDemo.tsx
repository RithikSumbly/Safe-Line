import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AnnotatedVerdictCard } from "@/components/AnnotatedVerdictCard";
import { Button } from "@/components/ui/button";
import { MOCK_VERDICTS } from "@/data/mockVerdicts";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { cn } from "@/lib/cn";

const CYCLE_EXAMPLES = [
  MOCK_VERDICTS.scam,
  MOCK_VERDICTS.job_offer,
  MOCK_VERDICTS.crisis_rumor,
];

const CYCLE_MS = 8000;
const TYPE_MS = 14;

export function HeroLiveDemo() {
  const reduced = usePrefersReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);
  const [displayText, setDisplayText] = useState(CYCLE_EXAMPLES[0].input_text);
  const [showVerdict, setShowVerdict] = useState(true);
  const [paused, setPaused] = useState(false);
  const typewriterRef = useRef<number | null>(null);
  const cycleRef = useRef<number | null>(null);
  const verdictDelayRef = useRef<number | null>(null);
  const indexRef = useRef(0);

  const reservedText = useMemo(
    () =>
      CYCLE_EXAMPLES.reduce(
        (longest, item) =>
          item.input_text.length > longest.length ? item.input_text : longest,
        CYCLE_EXAMPLES[0].input_text,
      ),
    [],
  );

  const clearTimers = useCallback(() => {
    if (typewriterRef.current) {
      window.clearInterval(typewriterRef.current);
      typewriterRef.current = null;
    }
    if (cycleRef.current) {
      window.clearInterval(cycleRef.current);
      cycleRef.current = null;
    }
    if (verdictDelayRef.current) {
      window.clearTimeout(verdictDelayRef.current);
      verdictDelayRef.current = null;
    }
  }, []);

  const runExample = useCallback(
    (idx: number) => {
      const example = CYCLE_EXAMPLES[idx];
      setShowVerdict(false);

      if (reduced) {
        setDisplayText(example.input_text);
        setShowVerdict(true);
        return;
      }

      setDisplayText("");
      let i = 0;
      typewriterRef.current = window.setInterval(() => {
        i += 1;
        setDisplayText(example.input_text.slice(0, i));
        if (i >= example.input_text.length) {
          if (typewriterRef.current) {
            window.clearInterval(typewriterRef.current);
            typewriterRef.current = null;
          }
          verdictDelayRef.current = window.setTimeout(
            () => setShowVerdict(true),
            250,
          );
        }
      }, TYPE_MS);
    },
    [reduced],
  );

  useEffect(() => {
    if (paused) {
      clearTimers();
      return;
    }

    const idx = indexRef.current;
    setActiveIndex(idx);
    runExample(idx);

    cycleRef.current = window.setInterval(() => {
      const next = (indexRef.current + 1) % CYCLE_EXAMPLES.length;
      indexRef.current = next;
      setActiveIndex(next);
      runExample(next);
    }, CYCLE_MS);

    return clearTimers;
  }, [paused, runExample, clearTimers]);

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:items-start lg:gap-12">
      <div>
        <p className="kicker">Live intake</p>
        <p className="mt-2 font-sans text-sm text-ink/55">
          Not sure about a bank SMS, job offer, or local rumour? Paste it in
          chat and SafeLine will verify it against live sources.
        </p>
        <div className="relative mt-4 rounded-[10px] border border-line bg-paper px-4 py-3 font-sans text-sm leading-relaxed text-ink/70">
          <p className="invisible whitespace-pre-wrap" aria-hidden>
            {reservedText}
          </p>
          <p className="absolute inset-0 overflow-hidden whitespace-pre-wrap px-4 py-3">
            {displayText}
          </p>
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

      <div className="relative min-h-[28rem]">
        <AnnotatedVerdictCard
          verdict={CYCLE_EXAMPLES[activeIndex]}
          animate={false}
          className={cn(
            "transition-opacity duration-500 ease-out",
            showVerdict ? "opacity-100" : "opacity-0",
          )}
        />
      </div>
    </div>
  );
}
