import type { FallbackReason } from "./agent-run";
import type { Candidate } from "./candidate";
import type { Selection } from "./product-selector.port";

export type AiFallbackReason = Exclude<FallbackReason, "not_configured" | "forced_rules" | "no_eligible_candidates">;

/** Either the AI's selection or why it could not be used (FR-009b). */
export type AiSelectionResult = { selection: Selection } | { fallback: AiFallbackReason };

/** Asks the local model to choose among the kept candidates (research R5). */
export interface AiSelectorPort {
  select(request: string, kept: readonly Candidate[]): Promise<AiSelectionResult>;
}

export const AI_SELECTOR = Symbol("AiSelectorPort");
