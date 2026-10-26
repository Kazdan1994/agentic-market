import { describe, expect, it } from "vitest";
import { formatMoney, parseEuros } from "./money";

describe("parseEuros", () => {
  it.each([
    ["89.99", 8999],
    ["100", 10000],
    ["0.5", 50],
    ["  12.30 ", 1230],
  ])("converts %j to %i cents exactly", (input, cents) => {
    expect(parseEuros(input)).toBe(cents);
  });

  it.each(["1.234", "-1", "", "abc", "1,50", "1e3"])("rejects %j", (input) => {
    expect(parseEuros(input)).toBeNull();
  });
});

describe("formatMoney", () => {
  it("formats cents with two decimals and the currency", () => {
    expect(formatMoney(8999, "EUR")).toBe("89.99 EUR");
    expect(formatMoney(10000, "EUR")).toBe("100.00 EUR");
    expect(formatMoney(5, "EUR")).toBe("0.05 EUR");
  });
});
