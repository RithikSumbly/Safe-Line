import { cn } from "@/lib/cn";

/** Soft tinted chips with ink text for AA contrast on pale backgrounds */
const SOURCES = [
  { name: "Google Safe Browsing", tint: "border-risk/40 bg-risk-soft text-ink" },
  { name: "VirusTotal", tint: "border-risk/40 bg-risk-soft text-ink" },
  { name: "Google Fact Check Tools", tint: "border-pending/40 bg-pending-soft text-ink" },
  { name: "NewsAPI", tint: "border-pending/40 bg-pending-soft text-ink" },
  { name: "India Code", tint: "border-verified/40 bg-verified-soft text-ink" },
  { name: "NALSA", tint: "border-verified/40 bg-verified-soft text-ink" },
  { name: "RBI", tint: "border-verified/40 bg-verified-soft text-ink" },
  { name: "PIB Fact Check", tint: "border-pending/40 bg-pending-soft text-ink" },
];

export function SourceTagRow({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)} aria-label="Evidence sources">
      {SOURCES.map(({ name, tint }) => (
        <span
          key={name}
          className={cn(
            "rounded-[4px] border px-2 py-1 font-mono text-[10px] font-medium uppercase tracking-wide",
            tint,
          )}
        >
          {name}
        </span>
      ))}
    </div>
  );
}
