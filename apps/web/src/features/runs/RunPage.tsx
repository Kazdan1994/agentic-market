import { Link, useParams } from "react-router";
import { QueryState } from "@/components/QueryState";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { formatMoney } from "@/features/agents/money";
import { type Order, useOrder } from "@/features/orders/useOrders";
import { DecisionLog } from "./DecisionLog";
import { OUTCOME_LABELS, strategyLabel } from "./run-labels";
import { type Run, useRun } from "./useRun";
import { useRunEvents } from "./useRunEvents";

export function RunPage() {
  const { runId = "" } = useParams();
  const run = useRun(runId);
  // The stream replaces polling: it carries every log entry, then the completed run.
  const { entries } = useRunEvents(runId);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8">
      <title>Run - Agentic Market</title>
      <Link to="/agents" className="inline-flex items-center gap-1.5 self-start text-sm text-muted hover:text-fg">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M15 6l-6 6 6 6" />
        </svg>
        Back to Agents
      </Link>
      <h1 className="text-2xl font-semibold">Run</h1>
      <QueryState
        query={run}
        resource="Run"
        skeleton={<div className="h-40 animate-pulse bg-paper" />}
        notFound={{ to: "/agents", label: "Back to Agents" }}
      >
        {(data) => (
          <>
            <RunSummary run={data} />
            <section aria-labelledby="decision-log" className="flex flex-col gap-3">
              <h2 id="decision-log" className="text-lg font-semibold">
                Decision log
              </h2>
              <DecisionLog entries={entries} />
            </section>
          </>
        )}
      </QueryState>
    </main>
  );
}

function RunSummary({ run }: { run: Run }) {
  const strategy = strategyLabel(run);
  return (
    <Card>
      <CardHeader>
        <CardTitle>“{run.request}”</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {run.status === "running" || !run.outcome ? (
          <Badge variant="secondary">Shopping…</Badge>
        ) : (
          <Badge variant={run.outcome === "order_placed" ? "success" : "secondary"}>{OUTCOME_LABELS[run.outcome]}</Badge>
        )}
        {strategy && <p className="text-sm text-muted">{strategy}</p>}
        {run.outcome === "order_placed" && run.orderId && <OrderSummary orderId={run.orderId} />}
      </CardContent>
    </Card>
  );
}

function OrderSummary({ orderId }: { orderId: string }) {
  const order = useOrder(orderId);
  return (
    <QueryState query={order} resource="Order" skeleton={<div className="h-16 animate-pulse bg-ground" />}>
      {(data) => <OrderFacts orderId={orderId} order={data} />}
    </QueryState>
  );
}

function OrderFacts({ orderId, order }: { orderId: string; order: Order }) {
  const { product, merchant, total } = order;
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
      <dt className="text-muted">Product</dt>
      <dd>{product.name}</dd>
      <dt className="text-muted">Merchant</dt>
      <dd>{merchant.name}</dd>
      <dt className="text-muted">Price</dt>
      <dd>{formatMoney(total.amountMinor, total.currency)}</dd>
      <dd className="col-span-2">
        <Link to={`/orders/${orderId}`} className="underline">
          View order
        </Link>
      </dd>
    </dl>
  );
}
