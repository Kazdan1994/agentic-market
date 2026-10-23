import { describe, expect, it } from "vitest";
import { evaluateCandidates } from "./candidate-evaluator";
import { candidate } from "../../../test/support/candidates";

describe("evaluateCandidates", () => {
  it("discards ineligible results with the API's reason", () => {
    const results = evaluateCandidates([
      candidate({ productId: "p1", eligibility: { eligible: false, reasonCode: "over_budget" } }),
      candidate({ productId: "p2", eligibility: { eligible: false, reasonCode: "category_not_allowed" } }),
      candidate({ productId: "p3", eligibility: { eligible: false, reasonCode: "out_of_stock" } }),
      candidate({ productId: "p4" }),
    ]);
    expect(results.map((r) => [r.candidate.productId, r.verdict, r.reasonCode])).toEqual([
      ["p1", "discarded", "over_budget"],
      ["p2", "discarded", "category_not_allowed"],
      ["p3", "discarded", "out_of_stock"],
      ["p4", "kept", null],
    ]);
  });

  it("discards the dearer of two eligible offers of the same item as cheaper_offer_elsewhere", () => {
    const dear = candidate({ productId: "dear", itemRef: "audio-runbuds-pro", merchantName: "SoundHub", priceMinor: 8_900 });
    const cheap = candidate({ productId: "cheap", itemRef: "audio-runbuds-pro", merchantName: "TechCorner", priceMinor: 7_900 });
    const results = evaluateCandidates([dear, cheap]);
    expect(results.find((r) => r.candidate.productId === "dear")).toMatchObject({
      verdict: "discarded",
      reasonCode: "cheaper_offer_elsewhere",
      cheaperOffer: { productId: "cheap" },
    });
    expect(results.find((r) => r.candidate.productId === "cheap")?.verdict).toBe("kept");
  });

  it("does not let an ineligible cheaper offer knock out an eligible one", () => {
    const eligible = candidate({ productId: "a", itemRef: "x", priceMinor: 8_900 });
    const outOfStock = candidate({ productId: "b", itemRef: "x", priceMinor: 7_900, eligibility: { eligible: false, reasonCode: "out_of_stock" } });
    expect(evaluateCandidates([eligible, outOfStock]).find((r) => r.candidate.productId === "a")?.verdict).toBe("kept");
  });
});
