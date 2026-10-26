import { describe, expect, it } from "vitest";
import { RuleBasedSelector } from "./rule-based-selector";
import { candidate } from "../../../test/support/candidates";

const selector = new RuleBasedSelector();

describe("RuleBasedSelector", () => {
  it("picks the best match and explains the others as weaker matches", async () => {
    const best = candidate({ productId: "best", name: "RunBuds Pro", description: "Wireless running earbuds" });
    const weaker = candidate({ productId: "weak", name: "Classic Earphones", description: "Wired earphones", priceMinor: 1_900 });
    const result = await selector.select("wireless running earbuds", [weaker, best]);
    expect(result.productId).toBe("best");
    expect(result.strategy).toBe("rules");
    expect(result.fallbackReason).toBeNull();
    expect(result.evaluations).toEqual([
      { productId: "best", verdict: "kept", reason: expect.any(String) },
      { productId: "weak", verdict: "discarded", reason: expect.stringContaining("weaker match") },
    ]);
  });

  it("breaks score ties by price, then listing date, then id", async () => {
    const a = candidate({ productId: "a", priceMinor: 5_000 });
    const b = candidate({ productId: "b", priceMinor: 4_000, listedAt: new Date("2026-09-02T00:00:00Z") });
    const c = candidate({ productId: "c", priceMinor: 4_000, listedAt: new Date("2026-09-01T00:00:00Z") });
    const d = candidate({ productId: "d", priceMinor: 4_000, listedAt: new Date("2026-09-01T00:00:00Z") });
    const result = await selector.select("earbuds", [a, b, d, c]);
    expect(result.productId).toBe("c");
    expect(result.evaluations.find((e) => e.productId === "d")?.reason).toContain("as good a match");
  });

  it("returns null when nothing is kept", async () => {
    expect((await selector.select("earbuds", [])).productId).toBeNull();
  });

  it("is deterministic", async () => {
    const pool = [candidate({ productId: "x", priceMinor: 100 }), candidate({ productId: "y", priceMinor: 100 })];
    const choices = await Promise.all([1, 2, 3, 4, 5].map(() => selector.select("earbuds", [...pool].reverse())));
    expect(new Set(choices.map((c) => c.productId))).toEqual(new Set(["x"]));
  });
});
