import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Checkbox({ className, ...props }: ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      className={cn(
        "size-4 shrink-0 rounded-sm border border-neutral-400 data-[state=checked]:bg-neutral-900 data-[state=checked]:text-white",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center text-[10px]">
        ✓
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}
