import { describe, expect, it } from "vitest";
import { Money } from "./money";

describe("Money", () => {
  it("holds an integer amount of minor units and a currency", () => {
    const price = Money.of(8999, "EUR");
    expect(price.amountMinor).toBe(8999);
    expect(price.currency).toBe("EUR");
  });

  it.each([-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])("rejects amount %s", (amount) => {
    expect(() => Money.of(amount, "EUR")).toThrow(/amount/i);
  });

  it.each(["eur", "EURO", "", "E1R"])("rejects currency %j", (currency) => {
    expect(() => Money.of(100, currency)).toThrow(/currency/i);
  });

  it("adds and subtracts amounts of the same currency", () => {
    expect(Money.of(100, "EUR").add(Money.of(250, "EUR")).amountMinor).toBe(350);
    expect(Money.of(350, "EUR").subtract(Money.of(100, "EUR")).amountMinor).toBe(250);
  });

  it("refuses to go below zero", () => {
    expect(() => Money.of(100, "EUR").subtract(Money.of(101, "EUR"))).toThrow(/negative/i);
  });

  it("refuses to mix currencies", () => {
    expect(() => Money.of(100, "EUR").add(Money.of(100, "USD"))).toThrow(/currenc/i);
    expect(() => Money.of(100, "EUR").lessThanOrEqual(Money.of(100, "USD"))).toThrow(/currenc/i);
  });

  it("compares exactly to the cent", () => {
    const limit = Money.of(10000, "EUR");
    expect(Money.of(10000, "EUR").lessThanOrEqual(limit)).toBe(true);
    expect(Money.of(10001, "EUR").lessThanOrEqual(limit)).toBe(false);
  });

  it("returns the smaller of two amounts", () => {
    expect(Money.min(Money.of(500, "EUR"), Money.of(300, "EUR")).amountMinor).toBe(300);
  });

  it("formats as major units with two decimals", () => {
    expect(Money.of(8900, "EUR").format()).toBe("89.00 EUR");
    expect(Money.of(5, "EUR").format()).toBe("0.05 EUR");
  });

  it("is immutable", () => {
    const base = Money.of(100, "EUR");
    base.add(Money.of(1, "EUR"));
    expect(base.amountMinor).toBe(100);
    expect(Object.isFrozen(base)).toBe(true);
  });
});
