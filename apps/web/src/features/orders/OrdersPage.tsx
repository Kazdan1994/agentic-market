import { Link } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatMoney } from "@/features/agents/money";
import { ORDER_STATUS_LABEL, PLACED_BY_LABELS, placedAt, useOrders } from "./useOrders";

export function OrdersPage() {
  const orders = useOrders();

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8">
      <h1 className="text-2xl font-semibold">Orders</h1>
      {orders.isError && <p role="alert">Orders could not be loaded. Please reload.</p>}
      {orders.data?.length === 0 && <p className="text-neutral-600">No order yet.</p>}
      {orders.data && orders.data.length > 0 && (
        <Card className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-neutral-500">
              <tr>
                <th className="p-3">Product</th>
                <th className="p-3">Merchant</th>
                <th className="p-3">Total</th>
                <th className="p-3">Status</th>
                <th className="p-3">Placed</th>
                <th className="p-3">By</th>
              </tr>
            </thead>
            <tbody>
              {orders.data.map((order) => (
                <tr key={order.id} className="border-t border-neutral-200">
                  <td className="p-3">
                    <Link to={`/orders/${order.id}`} className="underline">
                      {order.product.name}
                    </Link>
                  </td>
                  <td className="p-3">{order.merchant.name}</td>
                  <td className="p-3">{formatMoney(order.total.amountMinor, order.total.currency)}</td>
                  <td className="p-3">
                    <Badge variant="success">{ORDER_STATUS_LABEL}</Badge>
                  </td>
                  <td className="p-3">{placedAt.format(new Date(order.placedAt))}</td>
                  <td className="p-3">{PLACED_BY_LABELS[order.placedBy]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </main>
  );
}
