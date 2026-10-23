import { describe, expect, it } from "vitest";
import { eligibilityOf, type MandateSnapshot } from "./eligibility";

const AUDIO = "00000000-0000-7000-8000-0000000000c1";
const BOOKS = "00000000-0000-7000-8000-0000000000c2";
const mandate: MandateSnapshot = { perPurchaseCapMinor: 10_000, remainingMinor: 7_000, categoryIds: [AUDIO] };

describe("eligibilityOf", () => {
  it("is eligible at exactly min(cap, remaining)", () => {
    expect(eligibilityOf(mandate, { categoryId: AUDIO, priceMinor: 7_000, stock: 1 })).toEqual({ eligible: true, reasonCode: null });
  });

  it("is over budget one cent above min(cap, remaining)", () => {
    expect(eligibilityOf(mandate, { categoryId: AUDIO, priceMinor: 7_001, stock: 1 })).toEqual({ eligible: false, reasonCode: "over_budget" });
  });

  it("flags category and stock problems", () => {
    expect(eligibilityOf(mandate, { categoryId: BOOKS, priceMinor: 100, stock: 1 }).reasonCode).toBe("category_not_allowed");
    expect(eligibilityOf(mandate, { categoryId: AUDIO, priceMinor: 100, stock: 0 }).reasonCode).toBe("out_of_stock");
  });
});
