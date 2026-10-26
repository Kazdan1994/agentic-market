import { describe, expect, it } from "vitest";
import { LogMessages } from "./log-messages";
import { candidate } from "../../../test/support/candidates";

const limits = { perPurchaseCapMinor: 10_000, remainingMinor: 15_000, currency: "EUR" };

describe("LogMessages", () => {
  it("explains an over-cap discard with merchant and formatted prices", () => {
    const trail = candidate({ productId: "p", name: "Trail Buds Pro", merchantName: "SoundHub", priceMinor: 12_900 });
    expect(LogMessages.discarded(trail, "over_budget", limits)).toBe(
      'Discarded "Trail Buds Pro" from SoundHub: 129.00 EUR is over the 100.00 EUR per-purchase cap.',
    );
  });

  it("names the remaining budget when that is the binding limit", () => {
    const p = candidate({ productId: "p", name: "Studio Max", merchantName: "TechCorner", priceMinor: 9_000 });
    expect(LogMessages.discarded(p, "over_budget", { ...limits, remainingMinor: 5_000 })).toBe(
      'Discarded "Studio Max" from TechCorner: 90.00 EUR is over the 50.00 EUR remaining budget.',
    );
  });

  it("lists both offers in a comparison", () => {
    const dear = candidate({ productId: "d", name: "RunBuds Pro", merchantName: "SoundHub", priceMinor: 8_900 });
    const cheap = candidate({ productId: "c", name: "RunBuds Pro", merchantName: "TechCorner", priceMinor: 7_900 });
    expect(LogMessages.cheaperElsewhere(dear, cheap)).toBe(
      'Discarded "RunBuds Pro" from SoundHub at 89.00 EUR: cheaper offer elsewhere, 79.00 EUR at TechCorner.',
    );
  });

  it.each([
    ["category_not_allowed", "its category is not allowed by the mandate"],
    ["out_of_stock", "it is out of stock"],
  ] as const)("explains %s", (reason, text) => {
    expect(LogMessages.discarded(candidate({ productId: "p" }), reason, limits)).toContain(text);
  });

  it.each([
    ["ai", null, "Chosen by the local AI."],
    ["rules", null, "Chosen by the rule-based selector."],
    ["rules", "forced_rules", "Chosen by the rule-based selector: rule-based selection is forced by configuration."],
    ["rules", "timeout", "Chosen by the rule-based selector: the local AI did not answer in time."],
  ] as const)("states the %s strategy and fallback %s", (strategy, fallbackReason, expected) => {
    expect(LogMessages.strategy(strategy, fallbackReason)).toBe(expected);
  });
});
