import { Slot } from "@radix-ui/react-slot";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

const VARIANTS = {
  default: "bg-fg text-white hover:bg-fg/90",
  outline: "border border-control bg-transparent hover:bg-ground",
  ghost: "text-muted hover:bg-ground hover:text-fg",
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
        "inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-full px-5 text-sm font-medium cursor-pointer transition duration-150 active:scale-97 disabled:pointer-events-none disabled:opacity-50",
        VARIANTS[variant],
        className,
      )}
      {...props}
    />
  );
}
