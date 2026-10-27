import { Link, useParams } from "react-router";
import { QueryState } from "@/components/QueryState";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { formatMoney } from "@/features/agents/money";
import { ORDER_STATUS_LABEL, PLACED_BY_LABELS, placedAt, useOrder } from "./useOrders";

export function OrderDetailPage() {
  const { orderId = "" } = useParams();
  const order = useOrder(orderId);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8">
      <title>Order - Agentic Market</title>
      <Link to="/orders" className="inline-flex items-center gap-1.5 self-start text-sm text-muted hover:text-fg">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M15 6l-6 6 6 6" />
        </svg>
        Back to Orders
      </Link>
      <h1 className="text-2xl font-semibold">Order</h1>
      <QueryState
        query={order}
        resource="Order"
        skeleton={<div className="h-40 animate-pulse bg-paper" />}
        notFound={{ to: "/orders", label: "Back to Orders" }}
      >
        {(data) => (
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>{data.product.name}</CardTitle>
            <Badge variant="success">{ORDER_STATUS_LABEL}</Badge>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <dt className="text-muted">Merchant</dt>
              <dd>{data.merchant.name}</dd>
              <dt className="text-muted">Total</dt>
              <dd>{formatMoney(data.total.amountMinor, data.total.currency)}</dd>
              <dt className="text-muted">Placed</dt>
              <dd>{placedAt.format(new Date(data.placedAt))}</dd>
              <dt className="text-muted">By</dt>
              <dd>{PLACED_BY_LABELS[data.placedBy]}</dd>
            </dl>
            {data.runId && (
              <Link to={`/runs/${data.runId}`} className="mt-4 inline-block text-sm underline">
                Decision log
              </Link>
            )}
          </CardContent>
        </Card>
        )}
      </QueryState>
    </main>
  );
}
