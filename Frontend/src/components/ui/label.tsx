import * as LabelPrimitive from "@radix-ui/react-label";
import * as React from "react";
import { cn } from "@/lib/cn";

export function Label({
  className,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      className={cn(
        "font-sans text-sm font-medium text-ink",
        className,
      )}
      {...props}
    />
  );
}
