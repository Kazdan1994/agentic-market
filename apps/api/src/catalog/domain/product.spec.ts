import { describe, expect, it } from "vitest";
import { Product } from "./product";

const base = {
  id: "00000000-0000-7000-8000-000000000001",
  merchantId: "00000000-0000-7000-8000-0000000000a1",
  categoryId: "00000000-0000-7000-8000-0000000000c1",
  itemRef: "audio-runbuds-pro",
  name: "RunBuds Pro",
  description: "Wireless sport earbuds",
  priceMinor: 8900,
  currency: "EUR",
  stock: 4,
  listedAt: new Date("2026-10-01T00:00:00Z"),
};

describe("Product", () => {
  it("exposes its price as Money", () => {
    expect(Product.create(base).price.format()).toBe("89.00 EUR");
  });

  it.each([0, -100])("rejects price %i", (priceMinor) => {
    expect(() => Product.create({ ...base, priceMinor })).toThrow(/price/i);
  });

  it("rejects negative stock", () => {
    expect(() => Product.create({ ...base, stock: -1 })).toThrow(/stock/i);
  });

  it("only accepts EUR", () => {
    expect(() => Product.create({ ...base, currency: "USD" })).toThrow(/EUR/);
  });

  it("is in stock only with stock above zero", () => {
    expect(Product.create(base).isInStock()).toBe(true);
    expect(Product.create({ ...base, stock: 0 }).isInStock()).toBe(false);
  });
});
