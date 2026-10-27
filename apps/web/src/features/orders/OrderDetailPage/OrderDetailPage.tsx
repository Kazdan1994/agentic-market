import { Link, useParams } from "react-router";
import { QueryState } from "@/components/QueryState";
import { ReceiptMark } from "@/components/ReceiptMark";
import { Button } from "@/components/ui/Button";
import { formatMoney } from "@/features/agents/money";
import { useAgents } from "@/features/agents/useAgents";
import { logTime } from "@/features/runs/DecisionLog";
import { useRun } from "@/features/runs/useRun";
import { useRunLog } from "@/features/runs/useRunLog";
import { type Order, PLACED_BY_LABELS, useOrder } from "../useOrders";

const placedDate = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });

const shortId = (id: string) => id.slice(-4).toUpperCase();

export function OrderDetailPage() {
  const { orderId = "" } = useParams();
  const order = useOrder(orderId);

  return (
    <main className="mx-auto w-full max-w-page px-6 pt-8 pb-24">
      <title>Order - Agentic Market</title>
      <Link to="/orders" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M15 6l-6 6 6 6" />
        </svg>
        Back to Orders
      </Link>
      <h1 className="sr-only">Order</h1>
      <QueryState
        query={order}
        resource="Order"
        skeleton={<div className="mt-8 h-40 animate-pulse bg-paper" />}
        notFound={{ to: "/orders", label: "Back to Orders" }}
      >
        {(data) => (
          <div className="mt-8 flex flex-wrap items-start gap-14">
            <OrderReceipt order={data} />
            {data.runId && <OrderWhy runId={data.runId} />}
          </div>
        )}
      </QueryState>
    </main>
  );
}

function OrderReceipt({ order }: { order: Order }) {
  const agents = useAgents();
  const agent = agents.data?.find((candidate) => candidate.mandate.id === order.mandateId)?.name;
  const placed = new Date(order.placedAt);
  const currency = order.total.currency;
  const parties = [
    { label: "SOLD BY", value: order.merchant.name },
    { label: "BOUGHT BY", value: agent ?? PLACED_BY_LABELS[order.placedBy] },
    { label: "MANDATE", value: `Nº ${shortId(order.mandateId)}` },
  ];

  return (
    <article
      aria-labelledby="receipt"
      className="slip-edge w-full max-w-105 px-7 pt-7 pb-8 font-print text-print leading-receipt"
    >
      <div className="flex flex-col items-center text-center">
        <ReceiptMark />
        <h2 id="receipt" className="mt-1.5 font-bold">
          ORDER Nº {order.id.slice(-8, -4).toUpperCase()}-{shortId(order.id)}
        </h2>
        <p className="text-faint">
          {placedDate.format(placed).toUpperCase()} · {logTime(order.placedAt)}
        </p>
      </div>

      <div className="mt-4.5 border-t border-dashed border-dots pt-3">
        {parties.map(({ label, value }) => (
          <div key={label} className="flex gap-1.5">
            <span>{label}</span>
            <i aria-hidden="true" className="mb-1.5 flex-1 border-b border-dotted border-dots" />
            <span className="uppercase">{value}</span>
          </div>
        ))}
      </div>

      <div className="mt-3 border-t border-dashed border-dots pt-3">
        <p className="font-bold uppercase">
          {order.quantity} × <span>{order.product.name}</span>
        </p>
        <div className="mt-1 flex gap-1.5">
          <span>UNIT PRICE</span>
          <i aria-hidden="true" className="mb-1.5 flex-1 border-b border-dotted border-dots" />
          <span>{formatMoney(order.unitPrice.amountMinor, order.unitPrice.currency)}</span>
        </div>
      </div>

      <div className="mt-3 flex gap-1.5 border-t-2 border-fg pt-2.5 text-lead font-bold">
        <span>TOTAL</span>
        <i aria-hidden="true" className="mb-1.5 flex-1 border-b border-dotted border-dots" />
        <span>{formatMoney(order.total.amountMinor, currency)}</span>
      </div>

      <p className="mt-3.5 border-y border-dashed border-dots py-2 text-center font-bold text-success">
        PAID · SIMULATED CHECKOUT APPROVED
      </p>
      <p className="mt-3.5 text-center text-faint">NO HUMAN INPUT WAS NEEDED</p>
    </article>
  );
}

/** Why the agent chose this product, read back from its run; the section keeps only what the run holds. */
function OrderWhy({ runId }: { runId: string }) {
  const log = useRunLog(runId);
  const run = useRun(runId);
  const reason = log.data?.find((entry) => entry.step === "selection")?.message;
  const request = run.data?.request;

  return (
    <section aria-label="Why the agent bought this" className="min-w-0 flex-1 basis-120">
      {reason && (
        <>
          <p className="font-medium text-muted">Why the agent bought this</p>
          <p className="mt-2 max-w-xl text-heading leading-snug font-medium tracking-display">{reason}</p>
        </>
      )}
      {log.isError && <p className="max-w-xl text-muted">The agent's reason could not be loaded.</p>}
      {request && <p className="mt-3.5 max-w-xl text-muted">Asked for “{request}”.</p>}
      <Button variant="outline" asChild className="mt-5">
        <Link to={`/runs/${runId}`}>Read the decision log</Link>
      </Button>
    </section>
  );
}
