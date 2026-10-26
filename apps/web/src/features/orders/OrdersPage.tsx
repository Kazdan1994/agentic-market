import { Link } from "react-router";
import { Badge } from "@/components/ui/badge";
import { QueryState } from "@/components/QueryState";
import { Card } from "@/components/ui/card";
import { formatMoney } from "@/features/agents/money";
import { ORDER_STATUS_LABEL, PLACED_BY_LABELS, placedAt, useOrders } from "./useOrders";

export function OrdersPage() {
  const orders = useOrders();

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8">
      <h1 className="text-2xl font-semibold">Orders</h1>
      <QueryState
        query={orders}
        resource="Orders"
        skeleton={<div className="h-48 animate-pulse bg-paper" />}
        isEmpty={(rows) => rows.length === 0}
        empty={
          <div className="flex flex-col items-start gap-2">
            <p>Orders appear once an agent buys something.</p>
            <Link to="/agents" className="font-medium underline underline-offset-4">
              Go to Agents
            </Link>
          </div>
        }
      >
        {(rows) => (
        <Card className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-muted">
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
              {rows.map((order) => (
                <tr key={order.id} className="border-t border-rule">
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
      </QueryState>
    </main>
  );
}
