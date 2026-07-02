import { useCallback, useEffect, useRef, useState } from "react";
import { AnnotatedVerdictCard } from "@/components/AnnotatedVerdictCard";
import { CheckingSourcesLoader } from "@/components/CheckingSourcesLoader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MOCK_VERDICTS } from "@/data/mockVerdicts";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { checkContent } from "@/lib/checkContent";
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
  const [liveVerdict, setLiveVerdict] = useState<AnnotatedVerdict | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkKey, setCheckKey] = useState(0);
  const [paused, setPaused] = useState(false);
  const [userEdited, setUserEdited] = useState(false);
  const [text, setText] = useState(CYCLE_EXAMPLES[0].input_text);
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
      setLiveVerdict(null);
      setText(example.input_text);
      runTypewriter(example.input_text, () => {
        setMockVerdict(example);
        setCheckKey((k) => k + 1);
      });
    },
    [runTypewriter],
  );

  useEffect(() => {
    if (paused || userEdited) {
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
  }, [paused, userEdited, showExample, clearTimers]);

  const runDemo = async () => {
    setPaused(true);
    clearTimers();
    setLoading(true);
    setMockVerdict(null);
    setLiveVerdict(null);
    try {
      const result = await checkContent("scam", { text });
      setLiveVerdict(result);
      setCheckKey((k) => k + 1);
    } finally {
      setLoading(false);
    }
  };

  const onTextChange = (value: string) => {
    setUserEdited(true);
    setPaused(true);
    clearTimers();
    setText(value);
    setDisplayText(value);
    setMockVerdict(null);
    setLiveVerdict(null);
  };

  const verdict = liveVerdict ?? mockVerdict;
  const textareaValue = userEdited ? text : displayText || text;

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-12">
      <div>
        <p className="kicker">Live intake</p>
        <p className="mt-2 font-sans text-sm text-ink/55">
          Paste a suspicious message. Sources are checked before a verdict is
          filed.
        </p>
        <Textarea
          value={textareaValue}
          onChange={(e) => onTextChange(e.target.value)}
          onFocus={() => {
            setPaused(true);
            clearTimers();
          }}
          className="mt-4 min-h-[120px] bg-paper"
          aria-label="Demo message input"
        />
        <Button onClick={runDemo} disabled={loading} className="mt-4">
          Check this message
        </Button>
      </div>

      <div className="min-h-[200px]">
        {loading && <CheckingSourcesLoader />}
        {verdict && !loading && (
          <AnnotatedVerdictCard key={checkKey} verdict={verdict} animate />
        )}
      </div>
    </div>
  );
}
