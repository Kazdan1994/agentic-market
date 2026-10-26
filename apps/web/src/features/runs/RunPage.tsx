import { Link, useParams } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/features/agents/money";
import { useOrder } from "@/features/orders/useOrders";
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
      <h1 className="text-2xl font-semibold">Run</h1>
      {run.isError && <p role="alert">This run could not be loaded.</p>}
      {run.data && <RunSummary run={run.data} />}
      {run.data && (
        <section aria-labelledby="decision-log" className="flex flex-col gap-3">
          <h2 id="decision-log" className="text-lg font-semibold">
            Decision log
          </h2>
          <DecisionLog entries={entries} />
        </section>
      )}
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
        {strategy && <p className="text-sm text-neutral-600">{strategy}</p>}
        {run.outcome === "order_placed" && run.orderId && <OrderSummary orderId={run.orderId} />}
      </CardContent>
    </Card>
  );
}

function OrderSummary({ orderId }: { orderId: string }) {
  const order = useOrder(orderId);
  if (order.isError) return <p role="alert">The order could not be loaded.</p>;
  if (!order.data) return null;
  const { product, merchant, total } = order.data;
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
      <dt className="text-neutral-500">Product</dt>
      <dd>{product.name}</dd>
      <dt className="text-neutral-500">Merchant</dt>
      <dd>{merchant.name}</dd>
      <dt className="text-neutral-500">Price</dt>
      <dd>{formatMoney(total.amountMinor, total.currency)}</dd>
      <dd className="col-span-2">
        <Link to={`/orders/${orderId}`} className="underline">
          View order
        </Link>
      </dd>
    </dl>
  );
}
