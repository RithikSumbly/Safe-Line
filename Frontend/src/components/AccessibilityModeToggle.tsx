import { Accessibility } from "lucide-react";
import { useA11yMode } from "@/contexts/A11yModeContext";
import { cn } from "@/lib/cn";

interface AccessibilityModeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export function AccessibilityModeToggle({
  className,
  showLabel = true,
}: AccessibilityModeToggleProps) {
  const { isAccessibility, toggleMode } = useA11yMode();

  return (
    <button
      type="button"
      onClick={toggleMode}
      className={cn(
        "a11y-control inline-flex items-center gap-2 rounded-[6px] border border-line px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider transition-colors",
        isAccessibility
          ? "bg-verified/15 text-ink hover:bg-verified/25"
          : "bg-transparent text-ink/55 hover:bg-ink/[0.04] hover:text-ink/80",
        className,
      )}
      aria-label={
        isAccessibility
          ? "Turn off accessibility mode"
          : "Turn on accessibility mode"
      }
      aria-pressed={isAccessibility}
      title={isAccessibility ? "Accessibility mode on" : "Accessibility mode"}
    >
      <Accessibility className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
      {showLabel && (
        <span className="hidden sm:inline">
          {isAccessibility ? "A11y on" : "A11y"}
        </span>
      )}
    </button>
  );
}
