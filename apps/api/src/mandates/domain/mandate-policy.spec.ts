import { describe, expect, it } from "vitest";
import { Money } from "../../shared/domain/money";
import { Mandate } from "./mandate";
import { MandatePolicy, type PurchasableProduct } from "./mandate-policy";

const NOW = new Date("2026-10-23T12:00:00Z");
const AUDIO = "00000000-0000-7000-8000-0000000000c1";
const BOOKS = "00000000-0000-7000-8000-0000000000c2";

function mandate(over: Partial<{ spentMinor: number; revokedAt: Date | null; expiresAt: Date }> = {}) {
  return Mandate.restore({
    id: "00000000-0000-7000-8000-000000000001",
    agentId: "00000000-0000-7000-8000-000000000002",
    userId: "00000000-0000-7000-8000-000000000003",
    perPurchaseCapMinor: 10_000,
    totalBudgetMinor: 15_000,
    spentMinor: 0,
    currency: "EUR",
    categoryIds: [AUDIO],
    expiresAt: new Date("2026-10-24T12:00:00Z"),
    revokedAt: null,
    createdAt: NOW,
    ...over,
  });
}

function product(priceMinor: number, over: Partial<{ categoryId: string; stock: number }> = {}): PurchasableProduct {
  const stock = over.stock ?? 3;
  return {
    categoryId: over.categoryId ?? AUDIO,
    price: Money.of(priceMinor, "EUR"),
    isInStock: () => stock > 0,
  };
}

const authorize = (m: Mandate, p: PurchasableProduct, expected: number) =>
  new MandatePolicy().authorize(m, p, expected, NOW);

describe("MandatePolicy.authorize", () => {
  it("allows a price exactly at the limit", () => {
    expect(authorize(mandate(), product(10_000), 10_000)).toEqual({ allowed: true });
    expect(authorize(mandate({ spentMinor: 8_000 }), product(7_000), 7_000)).toEqual({ allowed: true });
  });

  it("refuses one cent over each limit", () => {
    expect(authorize(mandate(), product(10_001), 10_001)).toEqual({ allowed: false, code: "OVER_PER_PURCHASE_CAP" });
    expect(authorize(mandate({ spentMinor: 8_000 }), product(7_001), 7_001)).toEqual({
      allowed: false,
      code: "OVER_REMAINING_BUDGET",
    });
  });

  it("returns the first failing rule in the documented order", () => {
    const everythingWrong = product(99_999, { categoryId: BOOKS, stock: 0 });
    const cases: [Mandate, PurchasableProduct, number, string][] = [
      [mandate({ revokedAt: NOW, spentMinor: 15_000 }), everythingWrong, 1, "MANDATE_REVOKED"],
      [mandate({ expiresAt: NOW, spentMinor: 15_000 }), everythingWrong, 1, "MANDATE_EXPIRED"],
      [mandate({ spentMinor: 15_000 }), everythingWrong, 1, "MANDATE_EXHAUSTED"],
      [mandate(), everythingWrong, 1, "CATEGORY_NOT_ALLOWED"],
      [mandate(), product(99_999, { stock: 0 }), 1, "OUT_OF_STOCK"],
      [mandate(), product(99_999), 1, "PRICE_CHANGED"],
      [mandate(), product(99_999), 99_999, "OVER_PER_PURCHASE_CAP"],
    ];
    for (const [m, p, expected, code] of cases) {
      expect(authorize(m, p, expected)).toEqual({ allowed: false, code });
    }
  });
});
