import type { Run } from "./useRun";
import type { LogEntry } from "./useRunEvents";

/** Log entries carry integer minor units without a currency; every merchant prices in euros. */
export const LOG_CURRENCY = "EUR";

export const STEP_LABELS: Record<LogEntry["step"], string> = {
  search: "Search",
  evaluation: "Evaluation",
  selection: "Selection",
  mandate_check: "Mandate check",
  payment: "Payment",
  outcome: "Outcome",
};

export const OUTCOME_LABELS: Record<NonNullable<Run["outcome"]>, string> = {
  order_placed: "Order placed",
  no_eligible_product: "Nothing to buy within the mandate",
  refused_by_mandate: "Refused by the mandate",
  payment_declined: "Payment declined",
  interrupted: "Interrupted",
};

const FALLBACK_LABELS: Record<NonNullable<Run["fallbackReason"]>, string> = {
  not_configured: "the local AI is not set up",
  forced_rules: "rules were forced in the settings",
  unavailable: "the local AI was unreachable",
  timeout: "the local AI took too long",
  api_error: "the local AI returned an error",
  unusable_answer: "the local AI's answer was unusable",
  ineligible_choice: "the local AI chose a product the mandate does not allow",
  no_eligible_candidates: "no product fit the mandate",
};

export function strategyLabel(run: Run): string | null {
  if (run.strategy === "ai") return "Chosen by the local AI";
  if (run.strategy !== "rules") return null;
  return run.fallbackReason ? `Chosen by the rules (${FALLBACK_LABELS[run.fallbackReason]})` : "Chosen by the rules";
}
