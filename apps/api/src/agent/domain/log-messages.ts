import { Money } from "../../shared/domain/money";
import type { FallbackReason, SelectionStrategy } from "./agent-run";
import type { Candidate } from "./candidate";

export interface MandateLimits {
  perPurchaseCapMinor: number;
  remainingMinor: number;
  currency: string;
}

const price = (c: Candidate) => Money.of(c.priceMinor, c.currency).format();
const money = (amountMinor: number, currency: string) => Money.of(amountMinor, currency).format();
const FALLBACK_CAUSES: Record<FallbackReason, string> = {
  not_configured: "the local AI is not configured",
  forced_rules: "rule-based selection is forced by configuration",
  unavailable: "the local AI could not be reached",
  timeout: "the local AI did not answer in time",
  api_error: "the local AI returned an error",
  unusable_answer: "the local AI's answer could not be used",
  ineligible_choice: "the local AI chose a product outside the eligible candidates",
};

const offer = (c: Candidate) => `"${c.name}" from ${c.merchantName}`;

/** Plain-language decision-log messages (FR-018, FR-019). */
export const LogMessages = {
  searched(query: string, results: readonly Candidate[]): string {
    const merchants = new Set(results.map((r) => r.merchantName)).size;
    return `Searched the catalog for "${query}": ${results.length} offer(s) from ${merchants} merchant(s).`;
  },

  kept(c: Candidate): string {
    return `Kept ${offer(c)} at ${price(c)}.`;
  },

  discarded(c: Candidate, reason: "over_budget" | "category_not_allowed" | "out_of_stock", limits: MandateLimits): string {
    if (reason === "category_not_allowed") return `Discarded ${offer(c)}: its category is not allowed by the mandate.`;
    if (reason === "out_of_stock") return `Discarded ${offer(c)}: it is out of stock.`;
    // The binding limit is whichever is lower: the per-purchase cap or what is left.
    return limits.perPurchaseCapMinor <= limits.remainingMinor
      ? `Discarded ${offer(c)}: ${price(c)} is over the ${money(limits.perPurchaseCapMinor, limits.currency)} per-purchase cap.`
      : `Discarded ${offer(c)}: ${price(c)} is over the ${money(limits.remainingMinor, limits.currency)} remaining budget.`;
  },

  cheaperElsewhere(dearer: Candidate, cheaper: Candidate): string {
    return `Discarded ${offer(dearer)} at ${price(dearer)}: cheaper offer elsewhere, ${price(cheaper)} at ${cheaper.merchantName}.`;
  },

  weakerMatch(c: Candidate, winner: Candidate): string {
    return `Discarded ${offer(c)} at ${price(c)}: a weaker match for the request than "${winner.name}".`;
  },

  lostTie(c: Candidate, winner: Candidate): string {
    return `Discarded ${offer(c)} at ${price(c)}: as good a match as "${winner.name}", which costs less or was listed earlier.`;
  },

  ruleChoice(c: Candidate): string {
    return `Chose ${offer(c)} at ${price(c)}: best match for the request, then lowest price.`;
  },

  noEligibleProduct(): string {
    return "No product fits the request within the mandate.";
  },

  strategy(strategy: SelectionStrategy, fallbackReason: FallbackReason | null): string {
    if (strategy === "ai") return "Chosen by the local AI.";
    return fallbackReason ? `Chosen by the rule-based selector: ${FALLBACK_CAUSES[fallbackReason]}.` : "Chosen by the rule-based selector.";
  },
};
