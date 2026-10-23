import { Link, useParams } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/features/agents/money";
import { ORDER_STATUS_LABEL, PLACED_BY_LABELS, placedAt, useOrder } from "./useOrders";

export function OrderDetailPage() {
  const { orderId = "" } = useParams();
  const order = useOrder(orderId);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8">
      <h1 className="text-2xl font-semibold">Order</h1>
      {order.isError && <p role="alert">This order could not be found.</p>}
      {order.data && (
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>{order.data.product.name}</CardTitle>
            <Badge variant="success">{ORDER_STATUS_LABEL}</Badge>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <dt className="text-neutral-500">Merchant</dt>
              <dd>{order.data.merchant.name}</dd>
              <dt className="text-neutral-500">Total</dt>
              <dd>{formatMoney(order.data.total.amountMinor, order.data.total.currency)}</dd>
              <dt className="text-neutral-500">Placed</dt>
              <dd>{placedAt.format(new Date(order.data.placedAt))}</dd>
              <dt className="text-neutral-500">By</dt>
              <dd>{PLACED_BY_LABELS[order.data.placedBy]}</dd>
            </dl>
            {order.data.runId && (
              <Link to={`/runs/${order.data.runId}`} className="mt-4 inline-block text-sm underline">
                View the run
              </Link>
            )}
          </CardContent>
        </Card>
      )}
    </main>
  );
}
