import type { FallbackReason, SelectionStrategy } from "./agent-run";
import type { Candidate } from "./candidate";

export interface SelectionEvaluation {
  productId: string;
  verdict: "kept" | "discarded";
  reason: string;
}

export interface Selection {
  productId: string | null;
  reason: string;
  evaluations: SelectionEvaluation[];
  strategy: SelectionStrategy;
  fallbackReason: FallbackReason | null;
}

/** Chooses one product among the kept candidates (FR-009). */
export interface ProductSelectorPort {
  select(request: string, kept: readonly Candidate[]): Promise<Selection>;
}

export const PRODUCT_SELECTOR = Symbol("ProductSelectorPort");
