import { Coffee, Sun } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/cn";

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export function ThemeToggle({ className, showLabel = true }: ThemeToggleProps) {
  const { isCoffee, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn(
        "inline-flex items-center gap-2 rounded-[6px] border border-line px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider transition-colors",
        isCoffee
          ? "bg-pending/15 text-ink hover:bg-pending/25"
          : "bg-ink/[0.03] text-ink/55 hover:bg-ink/[0.06] hover:text-ink",
        className,
      )}
      aria-label={isCoffee ? "Switch to desk mode" : "Switch to coffee mode"}
      aria-pressed={isCoffee}
      title={isCoffee ? "Desk mode" : "Coffee mode"}
    >
      <span className="relative flex h-4 w-7 shrink-0 items-center rounded-full border border-line bg-paper p-0.5">
        <span
          className={cn(
            "h-2.5 w-2.5 rounded-full transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
            isCoffee
              ? "translate-x-3 bg-pending"
              : "translate-x-0 bg-verified",
          )}
          aria-hidden
        />
      </span>
      {showLabel && (
        <span className="hidden items-center gap-1 sm:inline-flex">
          {isCoffee ? (
            <>
              <Coffee className="h-3 w-3" strokeWidth={2} />
              Coffee
            </>
          ) : (
            <>
              <Sun className="h-3 w-3" strokeWidth={2} />
              Desk
            </>
          )}
        </span>
      )}
      {!showLabel && (
        isCoffee ? (
          <Coffee className="h-3.5 w-3.5" strokeWidth={2} />
        ) : (
          <Sun className="h-3.5 w-3.5" strokeWidth={2} />
        )
      )}
    </button>
  );
}
