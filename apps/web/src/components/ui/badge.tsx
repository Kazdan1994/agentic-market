import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

const VARIANTS = {
  default: "bg-fg text-white",
  live: "bg-accent-pale text-accent-ink",
  secondary: "bg-ground text-muted",
  destructive: "bg-danger/10 text-danger",
  success: "bg-success-pale text-success-ink",
} as const;

type BadgeProps = ComponentProps<"span"> & { variant?: keyof typeof VARIANTS };

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full px-2.5 text-xs leading-[22px]",
        VARIANTS[variant],
        className,
      )}
      {...props}
    />
  );
}
