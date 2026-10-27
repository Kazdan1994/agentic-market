import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { makeLogEntry } from "@/test-utils";
import { DecisionLog, logTime } from "./DecisionLog";

const RUNBUDS = "01900000-0000-7000-8000-0000000a0901";
const TRAILBUDS = "01900000-0000-7000-8000-0000000a0902";
const CLASSIC = "01900000-0000-7000-8000-0000000a0903";

const entries = [
  makeLogEntry(1, { step: "search", message: "Searched for “running earbuds”: 3 results." }),
  makeLogEntry(2, {
    step: "evaluation",
    message: "Kept RunBuds Pro.",
    productId: RUNBUDS,
    data: { verdict: "kept", reasonCode: null, merchant: "TechCorner", priceMinor: 7900 },
  }),
  makeLogEntry(3, {
    step: "evaluation",
    message: "Discarded Trail Buds: over the cap.",
    productId: TRAILBUDS,
    data: { verdict: "discarded", reasonCode: "over_budget", merchant: "SoundHub", priceMinor: 12900 },
  }),
  makeLogEntry(4, {
    step: "evaluation",
    message: "Kept Classic Earphones.",
    productId: CLASSIC,
    data: { verdict: "kept", reasonCode: null, merchant: "SoundHub", priceMinor: 1900 },
  }),
  makeLogEntry(5, {
    step: "selection",
    message: "Chose RunBuds Pro.",
    productId: RUNBUDS,
    data: {
      strategy: "ai",
      evaluations: [
        { productId: RUNBUDS, verdict: "kept", reason: "Built for running." },
        { productId: CLASSIC, verdict: "discarded", reason: "Not evaluated by the AI.", notEvaluatedByAi: true },
      ],
    },
  }),
  makeLogEntry(6, { step: "mandate_check", message: "Checked the mandate." }),
  makeLogEntry(7, { step: "payment", message: "Paid 79.00 EUR to TechCorner." }),
  makeLogEntry(8, { step: "outcome", message: "Order placed." }),
];

const item = (message: string) => {
  const li = screen.getByText(message).closest("li");
  if (!li) throw new Error(`no entry for ${message}`);
  return within(li);
};

describe("DecisionLog", () => {
  it("shows each entry's time, step label and message in order", () => {
    render(<DecisionLog entries={entries} />);
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(8);
    const labels = ["Search", "Evaluation", "Evaluation", "Evaluation", "Selection", "Mandate check", "Payment", "Outcome"];
    items.forEach((li, index) => expect(within(li).getByText(labels[index] ?? "")).toBeInTheDocument());
    expect(item("Searched for “running earbuds”: 3 results.").getByText(logTime(entries[0]?.at ?? ""))).toBeInTheDocument();
  });

  it("shows a Kept or Discarded badge with merchant and price on evaluations", () => {
    render(<DecisionLog entries={entries} />);
    const kept = item("Kept RunBuds Pro.");
    expect(kept.getByText("Kept")).toBeInTheDocument();
    expect(kept.getByText("TechCorner - 79.00 EUR")).toBeInTheDocument();
    const discarded = item("Discarded Trail Buds: over the cap.");
    expect(discarded.getByText("Discarded")).toBeInTheDocument();
    expect(discarded.getByText("SoundHub - 129.00 EUR")).toBeInTheDocument();
  });

  it("marks products the AI did not evaluate as a rule-based verdict", () => {
    render(<DecisionLog entries={entries} />);
    expect(item("Kept Classic Earphones.").getByText("rule-based verdict")).toBeInTheDocument();
    expect(item("Kept RunBuds Pro.").queryByText("rule-based verdict")).not.toBeInTheDocument();
    expect(screen.getAllByText("rule-based verdict")).toHaveLength(1);
  });

  it("says when there is nothing yet", () => {
    render(<DecisionLog entries={[]} />);
    expect(screen.getByText("Waiting for the agent's first step…")).toBeInTheDocument();
  });
});
