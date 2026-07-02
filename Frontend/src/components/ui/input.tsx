import * as React from "react";
import { cn } from "@/lib/cn";

export function Input({
  className,
  type,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-[6px] border border-line bg-paper px-3 py-2 font-sans text-sm text-ink placeholder:text-ink/40",
        className,
      )}
      {...props}
    />
  );
}
