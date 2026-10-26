import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

const VARIANTS = {
  default: "bg-neutral-900 text-white",
  secondary: "bg-neutral-100 text-neutral-900",
  destructive: "bg-red-100 text-red-800",
  success: "bg-green-100 text-green-800",
} as const;

type BadgeProps = ComponentProps<"span"> & { variant?: keyof typeof VARIANTS };

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
        VARIANTS[variant],
        className,
      )}
      {...props}
    />
  );
}
