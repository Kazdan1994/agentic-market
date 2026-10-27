import { useState } from "react";
import { Link } from "react-router";
import { QueryState } from "@/components/QueryState";
import { formatMoney } from "@/features/agents/money";
import { useAgents } from "@/features/agents/useAgents";
import { groupOrdersByMonth, sumMinor } from "../groupOrdersByMonth";
import { type Order, PLACED_BY_LABELS, placedAt, useOrders } from "../useOrders";

const CELL = "px-4.5 py-3.5";
const CHIP = "h-9 rounded-full px-3.5 text-sm";

export function OrdersPage() {
  const orders = useOrders();

  return (
    <main className="mx-auto w-full max-w-page px-6 pt-10 pb-24">
      <title>Orders - Agentic Market</title>
      <h1 className="text-body font-medium text-muted">Orders</h1>
      <QueryState
        query={orders}
        resource="Orders"
        skeleton={<div className="mt-8 h-48 animate-pulse bg-paper" />}
        isEmpty={(rows) => rows.length === 0}
        empty={
          <div className="mt-4 flex flex-col items-start gap-2">
            <p>Orders appear once an agent buys something.</p>
            <Link to="/agents" className="font-medium underline underline-offset-4">
              Go to Agents
            </Link>
          </div>
        }
      >
        {(rows) => <OrdersLedger orders={rows} />}
      </QueryState>
    </main>
  );
}

function OrdersLedger({ orders }: { orders: Order[] }) {
  const agents = useAgents();
  const [chosenId, setChosenId] = useState<string | null>(null);

  const [first] = orders;
  if (!first) return null;

  const agentNames = new Map((agents.data ?? []).map((agent) => [agent.mandate.id, agent.name]));
  const agentName = (order: Order) => agentNames.get(order.mandateId) ?? PLACED_BY_LABELS[order.placedBy];
  const chips = [...Map.groupBy(orders, (order) => order.mandateId)].flatMap(([id, rows]) => {
    const name = agentNames.get(id);
    return name ? [{ id, name, count: rows.length }] : [];
  });

  // The chosen agent can vanish when the agents reload or fail; then the list is unfiltered again.
  const mandateId = chips.some((chip) => chip.id === chosenId) ? chosenId : null;
  const visible = mandateId ? orders.filter((order) => order.mandateId === mandateId) : orders;
  const currency = first.total.currency;
  const total = formatMoney(sumMinor(visible), currency);
  const [units = total, fraction = ""] = total.split(".");
  const scope = chips.find((chip) => chip.id === mandateId)?.name ?? "your agents";

  return (
    <>
      <p
        data-testid="total"
        className="mt-2 text-hero leading-none font-medium tracking-hero tabular-nums"
      >
        {units}
        <span className="text-faint">.{fraction}</span>
      </p>
      <p className="mt-3.5 max-w-measure text-lead-lg leading-lead">
        spent by {scope} across {visible.length} {visible.length === 1 ? "order" : "orders"}, all paid by simulated
        checkout.
      </p>

      {chips.length > 1 && (
        <div role="group" aria-label="Filter by agent" className="mt-9 flex flex-wrap gap-2">
          <button
            type="button"
            aria-pressed={mandateId === null}
            onClick={() => setChosenId(null)}
            className={`${CHIP} ${mandateId === null ? "bg-fg text-paper" : "ring-1 ring-control ring-inset"}`}
          >
            All agents · {orders.length}
          </button>
          {chips.map((chip) => (
            <button
              key={chip.id}
              type="button"
              aria-pressed={mandateId === chip.id}
              onClick={() => setChosenId(chip.id)}
              className={`${CHIP} ${mandateId === chip.id ? "bg-fg text-paper" : "ring-1 ring-control ring-inset"}`}
            >
              {chip.name} · {chip.count}
            </button>
          ))}
        </div>
      )}

      <div className="mt-6 overflow-x-auto bg-paper">
        <table className="w-full min-w-140 text-left">
          <thead className="text-small text-muted">
            <tr>
              <th className={`${CELL} font-normal`}>Item</th>
              <th className={`${CELL} font-normal`}>Agent</th>
              <th className={`${CELL} hidden font-normal sm:table-cell`}>Placed</th>
              <th className={`${CELL} text-right font-normal`}>Total</th>
              <th className={CELL}>
                <span className="sr-only">Decision log</span>
              </th>
            </tr>
          </thead>
          {groupOrdersByMonth(visible).map((group) => (
            <tbody key={group.label}>
              <tr>
                <th
                  colSpan={5}
                  scope="colgroup"
                  className="border-t border-rule px-4.5 pt-4.5 pb-2 text-left font-print text-label font-bold text-faint"
                >
                  {group.label} · {formatMoney(group.totalMinor, currency)}
                </th>
              </tr>
              {group.orders.map((order) => (
                <tr key={order.id} className="border-t border-dashed border-dots hover:bg-stub">
                  <td className={CELL}>
                    <Link to={`/orders/${order.id}`} className="font-medium hover:underline">
                      {order.product.name}
                    </Link>
                    <div className="text-small text-muted">{order.merchant.name}</div>
                  </td>
                  <td className={`${CELL} text-muted`}>{agentName(order)}</td>
                  <td className={`${CELL} hidden text-muted sm:table-cell`}>{placedAt.format(new Date(order.placedAt))}</td>
                  <td className={`${CELL} text-right font-medium tabular-nums`}>
                    {formatMoney(order.total.amountMinor, order.total.currency)}
                  </td>
                  <td className={`${CELL} text-right`}>
                    {order.runId && (
                      <Link
                        to={`/runs/${order.runId}`}
                        aria-label={`Decision log for ${order.product.name}`}
                        className="text-sm text-muted hover:underline"
                      >
                        Log
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          ))}
          <tfoot>
            <tr className="border-t-2 border-fg">
              <th colSpan={3} scope="row" className={`${CELL} text-left font-print text-print`}>
                TOTAL
              </th>
              <td className={`${CELL} text-right font-semibold tabular-nums`}>{total}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </>
  );
}
