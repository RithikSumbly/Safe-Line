import { cn } from "@/lib/cn";

const SOURCES = [
  { name: "Google Safe Browsing", tint: "border-risk/30 bg-risk-soft/60 text-risk" },
  { name: "VirusTotal", tint: "border-risk/30 bg-risk-soft/60 text-risk" },
  { name: "Google Fact Check Tools", tint: "border-pending/30 bg-pending-soft/60 text-pending" },
  { name: "NewsAPI", tint: "border-pending/30 bg-pending-soft/60 text-pending" },
  { name: "India Code", tint: "border-verified/30 bg-verified-soft/60 text-verified" },
  { name: "NALSA", tint: "border-verified/30 bg-verified-soft/60 text-verified" },
  { name: "RBI", tint: "border-verified/30 bg-verified-soft/60 text-verified" },
  { name: "PIB Fact Check", tint: "border-pending/30 bg-pending-soft/60 text-pending" },
];

export function SourceTagRow({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {SOURCES.map(({ name, tint }) => (
        <span
          key={name}
          className={cn(
            "rounded-[4px] border px-2 py-1 font-mono text-[10px] uppercase tracking-wide",
            tint,
          )}
        >
          {name}
        </span>
      ))}
    </div>
  );
}
