import { z } from "zod";

/** The model's answer (research R5). The same schema constrains decoding and parses the reply. */
export const AiSelectionAnswer = z.object({
  chosenProductId: z.string().nullable(),
  reason: z.string(),
  evaluations: z.array(
    z.object({
      productId: z.string(),
      verdict: z.enum(["kept", "discarded"]),
      reason: z.string(),
    }),
  ),
});

export type AiSelectionAnswer = z.infer<typeof AiSelectionAnswer>;

export const AI_SELECTION_JSON_SCHEMA = z.toJSONSchema(AiSelectionAnswer);
