import { Mandate, type MandateProps } from "../../src/mandates/domain/mandate";

export const AUDIO_CATEGORY = "00000000-0000-7000-8000-0000000000c1";
export const KITCHEN_CATEGORY = "00000000-0000-7000-8000-0000000000c5";

/** A stored, active mandate for handler tests. */
export function testMandate(over: Partial<MandateProps> = {}): Mandate {
  return Mandate.restore({
    id: "00000000-0000-7000-8000-0000000000b1",
    agentId: "00000000-0000-7000-8000-0000000000a1",
    userId: "01900000-0000-7000-8000-00000000a11c",
    perPurchaseCapMinor: 10_000,
    totalBudgetMinor: 15_000,
    spentMinor: 0,
    currency: "EUR",
    categoryIds: [AUDIO_CATEGORY],
    expiresAt: new Date("2030-01-01T00:00:00Z"),
    revokedAt: null,
    createdAt: new Date("2026-10-01T00:00:00Z"),
    ...over,
  });
}
