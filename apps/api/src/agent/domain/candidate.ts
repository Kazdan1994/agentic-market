import type { IneligibilityReason } from "../../catalog/domain/eligibility";

/** A search result as the agent reads it from the public API (research R8). */
export interface Candidate {
  productId: string;
  itemRef: string;
  name: string;
  description: string;
  categoryName: string;
  merchantName: string;
  priceMinor: number;
  currency: string;
  listedAt: Date;
  eligibility: { eligible: boolean; reasonCode: IneligibilityReason | null };
}

export type DiscardReason = IneligibilityReason | "weaker_match" | "cheaper_offer_elsewhere";
