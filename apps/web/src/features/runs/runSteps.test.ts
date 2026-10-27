import { describe, expect, it } from "vitest";
import { makeLogEntry } from "@/test-utils";
import { summarizeSteps } from "./runSteps";

const entries = [
  makeLogEntry(1, { step: "search", data: { query: "earbuds", count: 6 } }),
  makeLogEntry(2, { step: "evaluation", data: { verdict: "kept" } }),
  makeLogEntry(3, { step: "evaluation", data: { verdict: "discarded" } }),
  makeLogEntry(4, { step: "evaluation", data: { verdict: "discarded" } }),
  makeLogEntry(5, { step: "selection", data: { strategy: "ai" } }),
  makeLogEntry(6, { step: "mandate_check", data: { priceMinor: 7900, limitMinor: 10000 } }),
  makeLogEntry(7, { step: "payment", data: { outcome: "approved" } }),
  makeLogEntry(8, { step: "outcome", data: { outcome: "order_placed" } }),
];

describe("summarizeSteps", () => {
  it("gives one step per stage, in run order, with what that stage found", () => {
    const steps = summarizeSteps(entries);

    expect(steps.map((s) => [s.label, s.summary])).toEqual([
      ["Search", "6 offers found"],
      ["Evaluation", "1 kept, 2 discarded"],
      ["Selection", "Local AI"],
      ["Mandate check", "Cap 100.00 EUR"],
      ["Payment", "Approved"],
      ["Outcome", "Order placed"],
    ]);
    expect(steps[1]?.at).toBe(entries[1]?.at);
    expect(steps.map((s) => s.succeeded)).toEqual([false, false, false, false, false, true]);
  });

  it("only lists the stages a live run has reached", () => {
    expect(summarizeSteps(entries.slice(0, 2)).map((s) => s.step)).toEqual(["search", "evaluation"]);
    expect(summarizeSteps([])).toEqual([]);
  });

  it("leaves the summary empty when the log carries no figure for it, and flags a refused run", () => {
    const steps = summarizeSteps([
      makeLogEntry(1, { step: "search", data: {} }),
      makeLogEntry(2, { step: "payment", data: { outcome: "declined", code: "card_declined" } }),
      makeLogEntry(3, { step: "outcome", data: { outcome: "payment_declined" } }),
    ]);

    expect(steps.map((s) => s.summary)).toEqual([null, "Declined", "Payment declined"]);
    expect(steps.at(-1)?.succeeded).toBe(false);
  });
});
