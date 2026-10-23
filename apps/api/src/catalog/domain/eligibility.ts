export type IneligibilityReason = "over_budget" | "category_not_allowed" | "out_of_stock";

export interface Eligibility {
  eligible: boolean;
  reasonCode: IneligibilityReason | null;
}

/** The parts of a mandate the hint needs. Kept small so catalog does not depend on mandates. */
export interface MandateSnapshot {
  perPurchaseCapMinor: number;
  remainingMinor: number;
  categoryIds: readonly string[];
}

export interface EligibilityInput {
  categoryId: string;
  priceMinor: number;
  stock: number;
}

/**
 * A hint shown next to search results so agents can explain discards. Checkout still runs
 * the full MandatePolicy; this hint is never the decision.
 */
export function eligibilityOf(mandate: MandateSnapshot, product: EligibilityInput): Eligibility {
  if (!mandate.categoryIds.includes(product.categoryId)) {
    return { eligible: false, reasonCode: "category_not_allowed" };
  }
  if (product.stock <= 0) return { eligible: false, reasonCode: "out_of_stock" };
  if (product.priceMinor > Math.min(mandate.perPurchaseCapMinor, mandate.remainingMinor)) {
    return { eligible: false, reasonCode: "over_budget" };
  }
  return { eligible: true, reasonCode: null };
}
