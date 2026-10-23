import type { FieldValues, Resolver } from "react-hook-form";
import { z } from "zod";
import { parseEuros } from "./money";

const euros = z
  .string()
  .transform((value, ctx) => {
    const cents = parseEuros(value);
    if (cents === null || cents <= 0) {
      ctx.addIssue({ code: "custom", message: "Enter an amount above 0." });
      return z.NEVER;
    }
    return cents;
  });

export const agentFormSchema = z
  .object({
    name: z.string().trim().min(1, "Enter a name."),
    perPurchaseCap: euros,
    totalBudget: euros,
    categorySlugs: z.array(z.string()).min(1, "Pick at least one category."),
    expiresAt: z
      .string()
      .refine((value) => new Date(value).getTime() > Date.now(), "Pick a date in the future."),
  })
  .refine((form) => form.perPurchaseCap <= form.totalBudget, {
    path: ["perPurchaseCap"],
    message: "The per-purchase cap cannot exceed the total budget.",
  });

export type AgentFormInput = z.input<typeof agentFormSchema>;
export type AgentFormOutput = z.output<typeof agentFormSchema>;

/** Minimal react-hook-form resolver for a zod schema: every issue lands on its first path segment. */
export function zodResolver<TInput extends FieldValues, TOutput>(
  schema: z.ZodType<TOutput, TInput>,
): Resolver<TInput, unknown, TOutput> {
  return async (values) => {
    const result = await schema.safeParseAsync(values);
    if (result.success) return { values: result.data, errors: {} };
    const errors: Record<string, { type: string; message: string }> = {};
    for (const issue of result.error.issues) {
      const field = String(issue.path[0] ?? "root");
      errors[field] ??= { type: issue.code, message: issue.message };
    }
    return { values: {}, errors } as never;
  };
}
