import { useEffect, useState } from "react";
import { LOADING_PHRASES } from "@/lib/constants";
import { cn } from "@/lib/cn";

interface CheckingSourcesLoaderProps {
  className?: string;
}

export function CheckingSourcesLoader({ className }: CheckingSourcesLoaderProps) {
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % LOADING_PHRASES.length);
    }, 600);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setProgress((p) => (p >= 92 ? 12 : p + 4));
    }, 280);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className={cn(
        "flex flex-col items-start gap-3 border border-line border-l-[3px] border-l-alive bg-pending-soft/30 p-6",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <p className="font-mono text-sm text-ink">{LOADING_PHRASES[index]}</p>
      <div
        className="h-1 w-full overflow-hidden bg-line"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress}
        aria-label="Check progress"
      >
        <div
          className="h-full bg-alive transition-[width] duration-300 ease-out motion-reduce:transition-none"
          style={{ width: `${progress}%` }}
          aria-hidden
        />
      </div>
      <p className="font-mono text-xs text-ink/55">
        {new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })}
      </p>
    </div>
  );
}
