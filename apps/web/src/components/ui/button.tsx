import { Slot } from "@radix-ui/react-slot";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

const VARIANTS = {
  default: "bg-neutral-900 text-white hover:bg-neutral-800",
  outline: "border border-neutral-300 bg-white hover:bg-neutral-50",
  ghost: "hover:bg-neutral-100",
} as const;

type ButtonProps = ComponentProps<"button"> & {
  variant?: keyof typeof VARIANTS;
  asChild?: boolean;
};

export function Button({ className, variant = "default", asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={cn(
        "inline-flex h-9 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
        VARIANTS[variant],
        className,
      )}
      {...props}
    />
  );
}
