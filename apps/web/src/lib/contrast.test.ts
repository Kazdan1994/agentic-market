import { describe, expect, it } from "vitest";
import { contrastRatio, TOKEN_PAIRS } from "./contrast";

describe("contrastRatio", () => {
  it("is 21 for black on white and 1 for a colour on itself", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 1);
    expect(contrastRatio("#1e4fd8", "#1e4fd8")).toBe(1);
  });
});

describe("brand token pairs (WCAG AA)", () => {
  it.each(TOKEN_PAIRS)("$name meets $min:1", ({ fg, bg, min }) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(min);
  });
});
