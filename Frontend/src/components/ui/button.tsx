import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/cn";

const buttonVariants = cva(
  "relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-[6px] font-sans text-sm font-medium transition-colors active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-verified text-paper hover:bg-verified/90 hover:shadow-[0_0_16px_rgb(var(--color-alive-rgb)/0.28)] active:shadow-[0_0_22px_rgb(var(--color-alive-rgb)/0.4)]",
        outline:
          "border border-ink/25 bg-transparent text-ink hover:bg-ink/[0.04]",
        ghost: "text-ink hover:bg-ink/[0.04]",
        verified:
          "border border-verified/40 bg-transparent text-verified hover:bg-verified/5",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-[6px] px-3 text-xs",
        lg: "h-11 rounded-[6px] px-5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}
