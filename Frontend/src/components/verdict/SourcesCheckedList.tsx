import { Check, ExternalLink, X } from "lucide-react";
import { cn } from "@/lib/cn";
import type { EvidenceItem } from "@/types/agent";

interface SourcesCheckedListProps {
  evidence: EvidenceItem[];
  animate?: boolean;
  ready?: boolean;
  reducedMotion?: boolean;
  className?: string;
}

export function SourcesCheckedList({
  evidence,
  animate = false,
  ready = true,
  reducedMotion = false,
  className,
}: SourcesCheckedListProps) {
  return (
    <div className={className}>
      <p className="kicker mb-4">Sources checked</p>
      <ol className="space-y-4">
        {evidence.map((item, i) => (
          <li
            key={item.source_name + i}
            className={cn(
              "flex gap-3",
              animate &&
                ready &&
                !reducedMotion &&
                "animate-[evidence-in_0.45s_cubic-bezier(0.34,1.56,0.64,1)_forwards]",
              animate &&
                ready &&
                reducedMotion &&
                "animate-[fade-up_0.4s_ease-out_forwards]",
            )}
            style={
              animate && ready
                ? {
                    animationDelay: `${0.25 + i * 0.06}s`,
                    opacity: ready ? undefined : 0,
                  }
                : undefined
            }
          >
            <span className="mt-0.5 shrink-0" aria-hidden>
              {item.supports_claim ? (
                <Check className="h-4 w-4 text-verified" strokeWidth={2} />
              ) : (
                <X className="h-4 w-4 text-risk" strokeWidth={2} />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-mono text-xs font-medium text-ink">
                {i + 1}. {item.source_name}
              </p>
              <p className="mt-1 font-sans text-sm text-ink/70">{item.snippet}</p>
              {item.source_url && (
                <a
                  href={item.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex items-center gap-1 font-mono text-xs text-verified hover:underline"
                >
                  {new URL(item.source_url).hostname}
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
