import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-md border border-control bg-paper px-3 py-1 text-sm placeholder:text-faint aria-invalid:border-danger",
        className,
      )}
      {...props}
    />
  );
}
