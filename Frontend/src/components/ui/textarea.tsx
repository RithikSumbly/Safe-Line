import * as React from "react";
import { cn } from "@/lib/cn";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      className={cn(
        "flex min-h-[140px] w-full rounded-[6px] border border-line bg-paper px-3 py-2 font-mono text-sm leading-relaxed text-ink placeholder:text-ink/40",
        className,
      )}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";
