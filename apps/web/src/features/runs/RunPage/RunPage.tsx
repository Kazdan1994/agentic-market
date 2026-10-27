import { Link, useParams } from "react-router";
import { QueryState } from "@/components/QueryState";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatMoney } from "@/features/agents/money";
import { type Order, useOrder } from "@/features/orders/useOrders";
import { DecisionLog, logTime } from "../DecisionLog";
import { OUTCOME_LABELS, strategyLabel } from "../run-labels";
import { type RunStep, summarizeSteps } from "../runSteps";
import { type Run, useRun } from "../useRun";
import { type LogEntry, useRunEvents } from "../useRunEvents";

const shortId = (id: string) => id.slice(-4).toUpperCase();

export function RunPage() {
  const { runId = "" } = useParams();
  const run = useRun(runId);
  // The stream replaces polling: it carries every log entry, then the completed run.
  const { entries } = useRunEvents(runId);

  return (
    <main className="mx-auto w-full max-w-page px-6 pt-8 pb-24">
      <title>Run - Agentic Market</title>
      <Link to="/agents" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M15 6l-6 6 6 6" />
        </svg>
        Back to Agents
      </Link>
      <h1 className="sr-only">Run</h1>
      <QueryState
        query={run}
        resource="Run"
        skeleton={<div className="mt-8 h-40 animate-pulse bg-paper" />}
        notFound={{ to: "/agents", label: "Back to Agents" }}
      >
        {(data) => <RunDetail run={data} entries={entries} />}
      </QueryState>
    </main>
  );
}

function RunDetail({ run, entries }: { run: Run; entries: LogEntry[] }) {
  const placed = run.outcome === "order_placed" && run.orderId;
  return (
    <>
      <RunHeader run={run} stepCount={entries.length} orderId={placed ? run.orderId : null} />
      <RunSteps steps={summarizeSteps(entries)} />
      <div className="grid items-start gap-10 lg:grid-cols-hero">
        {placed && <OrderSummary orderId={run.orderId as string} />}
        <aside
          aria-labelledby="decision-log"
          className="slip-edge px-5 pt-5 pb-6 font-print text-print leading-roll text-fg/85 lg:col-start-2"
        >
          <h2 id="decision-log" className="mb-2.5 font-bold text-fg uppercase">
            Decision log
          </h2>
          <DecisionLog entries={entries} />
        </aside>
      </div>
    </>
  );
}

function RunHeader({ run, stepCount, orderId }: { run: Run; stepCount: number; orderId: string | null }) {
  const strategy = strategyLabel(run);
  const seconds = run.endedAt ? (Date.parse(run.endedAt) - Date.parse(run.startedAt)) / 1000 : null;
  return (
    <section aria-labelledby="request" className="flex flex-wrap items-end justify-between gap-8 pt-5 pb-9">
      <div className="min-w-0 flex-1 basis-xl">
        <p className="mb-2 font-print text-label text-faint">
          RUN Nº {shortId(run.id)} · MANDATE Nº {shortId(run.mandateId)}
        </p>
        <h2 id="request" className="text-figure leading-tight font-medium tracking-display">
          “{run.request}”
        </h2>
        <p className="mt-3.5 flex flex-wrap items-center gap-2.5 text-muted">
          {run.status === "running" || !run.outcome ? (
            <Badge variant="secondary">Shopping…</Badge>
          ) : (
            <Badge variant={run.outcome === "order_placed" ? "success" : "secondary"}>{OUTCOME_LABELS[run.outcome]}</Badge>
          )}
          {strategy && <span>{strategy}</span>}
          {stepCount > 0 && (
            <span>
              {stepCount} {stepCount === 1 ? "step" : "steps"}
              {seconds !== null && ` in ${seconds.toFixed(1)} s`}
            </span>
          )}
        </p>
      </div>
      {orderId && (
        <Button asChild>
          <Link to={`/orders/${orderId}`}>View order</Link>
        </Button>
      )}
    </section>
  );
}

function RunSteps({ steps }: { steps: RunStep[] }) {
  if (steps.length === 0) return null;
  return (
    <ol aria-label="Run steps" className="mb-10 grid grid-cols-steps gap-1">
      {steps.map((step, index) => (
        <li key={step.step} className={`border-t-3 bg-paper px-3.5 py-3 ${step.succeeded ? "border-success" : "border-fg"}`}>
          <span className="block font-print text-label text-faint">
            {String(index + 1).padStart(2, "0")} · {logTime(step.at)}
          </span>
          <span className={`font-medium ${step.succeeded ? "text-success" : ""}`}>{step.label}</span>
          {step.summary && <span className="block text-small text-muted">{step.summary}</span>}
        </li>
      ))}
    </ol>
  );
}

function OrderSummary({ orderId }: { orderId: string }) {
  const order = useOrder(orderId);
  return (
    <section aria-labelledby="order">
      <h2 id="order" className="mb-4 text-heading font-medium tracking-tight">
        Order
      </h2>
      <QueryState query={order} resource="Order" skeleton={<div className="h-16 animate-pulse bg-paper" />}>
        {(data) => <OrderFacts order={data} />}
      </QueryState>
    </section>
  );
}

function OrderFacts({ order }: { order: Order }) {
  const { product, merchant, total } = order;
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-1 bg-paper px-4.5 py-4">
      <dt className="text-muted">Product</dt>
      <dd>{product.name}</dd>
      <dt className="text-muted">Merchant</dt>
      <dd>{merchant.name}</dd>
      <dt className="text-muted">Price</dt>
      <dd className="tabular-nums">{formatMoney(total.amountMinor, total.currency)}</dd>
    </dl>
  );
}
