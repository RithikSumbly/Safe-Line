import type { ReactNode } from "react";
import { useInView } from "@/hooks/useInView";
import { cn } from "@/lib/cn";

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
}

export function ScrollReveal({ children, className }: ScrollRevealProps) {
  const [ref, inView] = useInView<HTMLDivElement>(0.12);

  return (
    <div
      ref={ref}
      className={cn(
        "transition-[opacity,transform] duration-[400ms] ease-out motion-reduce:transition-none",
        inView ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
        className,
      )}
    >
      {children}
    </div>
  );
}
