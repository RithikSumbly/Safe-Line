import type { ReactNode } from "react";
import { RecentChecksStrip } from "./RecentChecksStrip";
import { cn } from "@/lib/cn";

interface ToolPageLayoutProps {
  title: string;
  intro: string;
  inputPanel: ReactNode;
  resultPanel: ReactNode;
  className?: string;
}

export function ToolPageLayout({
  title,
  intro,
  inputPanel,
  resultPanel,
  className,
}: ToolPageLayoutProps) {
  return (
    <div className={cn("content-shell py-10 md:py-12", className)}>
      <header className="border-b border-line pb-8">
        <p className="kicker">Checker</p>
        <h1 className="mt-2 font-display text-3xl text-ink md:text-[2rem]">
          {title}
        </h1>
        <p className="measure mt-3 font-sans text-sm leading-relaxed text-ink/55">
          {intro}
        </p>
      </header>

      <div className="mt-10 grid gap-10 lg:grid-cols-2 lg:gap-12">
        <div className="desk-panel p-6 md:p-7">
          <p className="kicker mb-5">Submission</p>
          {inputPanel}
        </div>
        <div className="min-h-[280px]">
          <p className="kicker mb-5">Verdict</p>
          {resultPanel}
        </div>
      </div>

      <RecentChecksStrip className="mt-12" />
    </div>
  );
}
