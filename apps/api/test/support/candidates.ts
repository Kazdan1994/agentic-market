import type { Candidate } from "../../src/agent/domain/candidate";

/** Builds a search result as the agent receives it from the public API. Test-only helper. */
export function candidate(over: Partial<Candidate> & { productId: string }): Candidate {
  return {
    itemRef: `item-${over.productId}`,
    name: "RunBuds Pro",
    description: "Wireless running earbuds",
    categoryName: "Audio",
    merchantName: "SoundHub",
    priceMinor: 8_900,
    currency: "EUR",
    listedAt: new Date("2026-09-01T00:00:00Z"),
    eligibility: { eligible: true, reasonCode: null },
    ...over,
  };
}
