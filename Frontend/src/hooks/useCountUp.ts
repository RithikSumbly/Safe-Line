import { useEffect, useState } from "react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

export function useCountUp(
  target: number,
  active: boolean,
  durationMs = 1200,
): number {
  const reduced = usePrefersReducedMotion();
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!active) return;
    if (reduced) {
      setValue(target);
      return;
    }
    let start: number | null = null;
    let frame: number;
    const step = (ts: number) => {
      if (start === null) start = ts;
      const progress = Math.min((ts - start) / durationMs, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [active, target, durationMs, reduced]);

  return value;
}
