import { Badge } from "@/components/ui/Badge";
import { formatMoney } from "@/features/agents/money";
import type { LogEntry } from "./useRunEvents";

const STEP_LABELS: Record<LogEntry["step"], string> = {
  search: "Search",
  evaluation: "Evaluation",
  selection: "Selection",
  mandate_check: "Mandate check",
  payment: "Payment",
  outcome: "Outcome",
};

const timeFormat = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

export const logTime = (at: string) => timeFormat.format(new Date(at));

interface EvaluationData {
  verdict?: string;
  merchant?: string;
  priceMinor?: number;
}

interface SelectionEvaluation {
  productId?: string;
  notEvaluatedByAi?: boolean;
}

/** Products the local AI left out of its answer; their verdict comes from the rules. */
function notEvaluatedByAi(entries: LogEntry[]): Set<string> {
  const evaluations = entries
    .filter((e) => e.step === "selection")
    .flatMap((e) => (Array.isArray(e.data.evaluations) ? (e.data.evaluations as SelectionEvaluation[]) : []));
  return new Set(evaluations.filter((e) => e.notEvaluatedByAi && e.productId).map((e) => e.productId as string));
}

export function DecisionLog({ entries }: { entries: LogEntry[] }) {
  if (entries.length === 0) return <p className="text-sm text-neutral-500">Waiting for the agent's first step…</p>;
  const ruleBased = notEvaluatedByAi(entries);
  return (
    <ol className="flex flex-col gap-3">
      {entries.map((entry) => (
        <li key={entry.seq} className="flex flex-col gap-1 border-l-2 border-neutral-200 pl-3 text-sm">
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <time dateTime={entry.at}>{logTime(entry.at)}</time>
            <span className="font-medium text-neutral-700">{STEP_LABELS[entry.step]}</span>
          </div>
          <p>{entry.message}</p>
          {entry.step === "evaluation" && (
            <Evaluation data={entry.data as EvaluationData} ruleBased={entry.productId !== null && ruleBased.has(entry.productId)} />
          )}
        </li>
      ))}
    </ol>
  );
}

function Evaluation({ data, ruleBased }: { data: EvaluationData; ruleBased: boolean }) {
  const kept = data.verdict === "kept";
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant={kept ? "success" : "secondary"}>{kept ? "Kept" : "Discarded"}</Badge>
      {data.merchant && data.priceMinor !== undefined && (
        <span className="text-xs text-neutral-600">
          {data.merchant} - {formatMoney(data.priceMinor, "EUR")}
        </span>
      )}
      {ruleBased && <span className="text-xs text-neutral-500 italic">rule-based verdict</span>}
    </div>
  );
}
