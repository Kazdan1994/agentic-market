import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "h-9 w-full rounded-md border border-neutral-300 bg-white px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 aria-invalid:border-red-500",
        className,
      )}
      {...props}
    />
  );
}
