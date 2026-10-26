import type { Candidate, DiscardReason } from "./candidate";

export interface Evaluation {
  candidate: Candidate;
  verdict: "kept" | "discarded";
  reasonCode: DiscardReason | null;
  /** For `cheaper_offer_elsewhere`: the offer that won. */
  cheaperOffer?: Candidate;
}

const cheaper = (a: Candidate, b: Candidate): boolean =>
  a.priceMinor !== b.priceMinor
    ? a.priceMinor < b.priceMinor
    : a.listedAt.getTime() !== b.listedAt.getTime()
      ? a.listedAt.getTime() < b.listedAt.getTime()
      : a.productId < b.productId;

/**
 * Keeps the eligible search results and, for an item sold by several merchants, only its
 * cheapest eligible offer (FR-008, FR-008a). Ineligible results keep the API's reason.
 */
export function evaluateCandidates(candidates: readonly Candidate[]): Evaluation[] {
  const bestByItem = new Map<string, Candidate>();
  for (const c of candidates) {
    if (!c.eligibility.eligible) continue;
    const best = bestByItem.get(c.itemRef);
    if (!best || cheaper(c, best)) bestByItem.set(c.itemRef, c);
  }
  return candidates.map((c) => {
    if (!c.eligibility.eligible) {
      if (!c.eligibility.reasonCode) throw new Error(`Ineligible product ${c.productId} has no reason code`);
      return { candidate: c, verdict: "discarded", reasonCode: c.eligibility.reasonCode };
    }
    const best = bestByItem.get(c.itemRef);
    if (best && best.productId !== c.productId) {
      return { candidate: c, verdict: "discarded", reasonCode: "cheaper_offer_elsewhere", cheaperOffer: best };
    }
    return { candidate: c, verdict: "kept", reasonCode: null };
  });
}
