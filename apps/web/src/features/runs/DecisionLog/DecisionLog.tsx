import { Badge } from "@/components/ui/Badge";
import { formatMoney } from "@/features/agents/money";
import { LOG_CURRENCY, STEP_LABELS } from "../run-labels";
import type { LogEntry } from "../useRunEvents";

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
  if (entries.length === 0) return <p className="text-small text-muted">Waiting for the agent's first step…</p>;
  const ruleBased = notEvaluatedByAi(entries);
  return (
    <ol>
      {entries.map((entry) => (
        <li key={entry.seq} className="grid grid-cols-log gap-2 border-t border-dashed border-dots py-1">
          <time dateTime={entry.at} className="text-faint">
            {logTime(entry.at)}
          </time>
          <div>
            <b className="text-fg uppercase">{STEP_LABELS[entry.step]}</b>
            <span className="block">{entry.message}</span>
            {entry.step === "evaluation" && (
              <Evaluation data={entry.data as EvaluationData} ruleBased={entry.productId !== null && ruleBased.has(entry.productId)} />
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

function Evaluation({ data, ruleBased }: { data: EvaluationData; ruleBased: boolean }) {
  const kept = data.verdict === "kept";
  return (
    <div className="mt-0.5 flex flex-wrap items-center gap-2">
      <Badge variant={kept ? "success" : "secondary"}>{kept ? "Kept" : "Discarded"}</Badge>
      {data.merchant && data.priceMinor !== undefined && (
        <span className="text-faint">
          {data.merchant} - {formatMoney(data.priceMinor, LOG_CURRENCY)}
        </span>
      )}
      {ruleBased && <span className="text-faint italic">rule-based verdict</span>}
    </div>
  );
}
