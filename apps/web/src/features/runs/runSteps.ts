import { formatMoney } from "@/features/agents/money";
import { LOG_CURRENCY, OUTCOME_LABELS, STEP_LABELS } from "./run-labels";
import type { LogEntry } from "./useRunEvents";

export interface RunStep {
  step: LogEntry["step"];
  label: string;
  at: string;
  summary: string | null;
  /** The step that ends the run with an order. */
  succeeded: boolean;
}

type Step = LogEntry["step"];

const STEP_ORDER: readonly Step[] = ["search", "evaluation", "selection", "mandate_check", "payment", "outcome"];

const asNumber = (value: unknown): number | null => (typeof value === "number" ? value : null);

function summarize(step: Step, entries: readonly LogEntry[]): string | null {
  const [first] = entries;
  if (!first) return null;
  const { data } = first;

  switch (step) {
    case "search": {
      const count = asNumber(data.count);
      return count === null ? null : `${count} ${count === 1 ? "offer" : "offers"} found`;
    }
    case "evaluation": {
      const kept = entries.filter((entry) => entry.data.verdict === "kept").length;
      return `${kept} kept, ${entries.length - kept} discarded`;
    }
    case "selection":
      return data.strategy === "ai" ? "Local AI" : data.strategy === "rules" ? "Rules" : null;
    case "mandate_check": {
      const limit = asNumber(data.limitMinor);
      return limit === null ? null : `Cap ${formatMoney(limit, LOG_CURRENCY)}`;
    }
    case "payment":
      return data.outcome === "approved" ? "Approved" : data.outcome === "declined" ? "Declined" : null;
    case "outcome":
      return typeof data.outcome === "string" && data.outcome in OUTCOME_LABELS
        ? OUTCOME_LABELS[data.outcome as keyof typeof OUTCOME_LABELS]
        : null;
  }
}

/** One entry per step the run has reached, in run order, timed at the step's first log entry. */
export function summarizeSteps(entries: readonly LogEntry[]): RunStep[] {
  return STEP_ORDER.flatMap((step) => {
    const ofStep = entries.filter((entry) => entry.step === step);
    const [first] = ofStep;
    if (!first) return [];
    return [
      {
        step,
        label: STEP_LABELS[step],
        at: first.at,
        summary: summarize(step, ofStep),
        succeeded: step === "outcome" && first.data.outcome === "order_placed",
      },
    ];
  });
}
