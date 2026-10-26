import { useId, useState } from "react";
import { Link } from "react-router";
import { QueryState } from "@/components/QueryState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { type Order, placedAt } from "@/features/orders/useOrders";
import { TillRoll } from "@/features/runs/TillRoll";
import type { Run } from "@/features/runs/useRun";
import { useRunEvents } from "@/features/runs/useRunEvents";
import { CreateAgentForm } from "./CreateAgentForm";
import { heroSentence, leftToSpend } from "./heroSentence";
import { MandateSlip } from "./MandateSlip";
import { formatMoney } from "./money";
import { type Agent, useAgents, useCategories } from "./useAgents";
import { useAgentActivity } from "./useAgentActivity";

type MandateStatus = Agent["mandate"]["status"];

const ENDED_LABEL: Record<Exclude<MandateStatus, "active">, string> = {
  exhausted: "Budget used up",
  expired: "Expired",
  revoked: "Revoked",
};

const LATEST_ORDERS = 5;

export function AgentsPage() {
  const agents = useAgents();

  return (
    <main className="mx-auto w-full max-w-page px-4 pb-20 sm:px-6">
      <title>Agents · Agentic Market</title>
      <h1 className="pt-10 text-body font-medium text-muted">Agents</h1>
      <QueryState
        query={agents}
        resource="Agents"
        skeleton={
          <div className="pt-2">
            <div className="h-24 w-80 animate-pulse bg-paper" />
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              <div className="h-80 animate-pulse bg-paper" />
              <div className="h-80 animate-pulse bg-paper" />
              <div className="h-80 animate-pulse bg-paper" />
            </div>
          </div>
        }
      >
        {(list) => <AgentsDesk agents={list} />}
      </QueryState>
    </main>
  );
}

function AgentsDesk({ agents }: { agents: Agent[] }) {
  const activity = useAgentActivity(agents);
  const [formOpen, setFormOpen] = useState(agents.length === 0);
  const [created, setCreated] = useState<string | null>(null);
  const formId = useId();
  const now = new Date();

  const active = agents
    .filter((agent) => agent.mandate.status === "active")
    .sort((a, b) => {
      const running = Number(activity.runningByMandate.has(b.mandate.id)) - Number(activity.runningByMandate.has(a.mandate.id));
      return running || a.mandate.expiresAt.localeCompare(b.mandate.expiresAt);
    });
  const ended = agents.filter((agent) => agent.mandate.status !== "active");
  const shopping = active.find((agent) => activity.runningByMandate.has(agent.mandate.id));
  const shoppingRun = shopping && activity.runningByMandate.get(shopping.mandate.id);
  const latestOrder = [...activity.ordersByMandate.values()].flat().sort((a, b) => b.placedAt.localeCompare(a.placedAt))[0];
  const amount = leftToSpend(agents);
  // The sentence opens with the amount; the hero sets the amount large, then the rest of the sentence.
  const rest = heroSentence(agents, activity.runningByMandate, now).slice(amount.length);
  const [units = amount, fraction = ""] = amount.split(".");

  const toggleForm = () => {
    setCreated(null);
    setFormOpen((open) => !open);
  };
  const onCreated = (name: string) => {
    setCreated(name);
    setFormOpen(false);
  };

  return (
    <>
      <section aria-label="Overview" className="grid items-end gap-6 pt-1.5 pb-12 md:grid-cols-hero">
        <div>
          <p>
            <span className="block text-hero leading-none font-medium tracking-hero tabular-nums sm:text-hero-lg">
              {units}
              <span className="text-faint">.{fraction}</span>
            </span>
            <span className="mt-4.5 block max-w-measure text-lead leading-lead sm:text-lead-lg">{rest.trim()}</span>
          </p>
          <div className="mt-7 flex gap-2.5">
            <Button aria-expanded={formOpen} aria-controls={formId} onClick={toggleForm}>
              New agent
            </Button>
            <Button variant="outline" asChild>
              <Link to="/orders">View orders</Link>
            </Button>
          </div>
        </div>
        {shopping && shoppingRun ? (
          <LiveRoll agentName={shopping.name} run={shoppingRun} />
        ) : (
          latestOrder && (
            <aside aria-label="Latest order" className="slip-edge bg-paper px-6 py-5">
              <p className="text-small text-muted">Latest order</p>
              <Link to={`/orders/${latestOrder.id}`} className="mt-2 block text-lead-lg leading-snug font-medium hover:underline">
                {latestOrder.product.name}
              </Link>
              <p className="mt-1 text-muted">
                {latestOrder.merchant.name} · {placedAt.format(new Date(latestOrder.placedAt))}
              </p>
              <p className="mt-4 text-stat leading-none font-medium tabular-nums">
                {formatMoney(latestOrder.total.amountMinor, latestOrder.total.currency)}
              </p>
            </aside>
          )
        )}
      </section>

      {created && (
        <p role="status" className="mb-6 bg-success-pale px-4 py-2.5 text-success-ink">
          Agent “{created}” created.
        </p>
      )}

      {formOpen && <NewAgentPanel id={formId} onCreated={onCreated} />}

      {activity.isError && (
        <div role="alert" className="mb-6 flex flex-wrap items-center gap-3">
          <p>Purchases and runs could not be loaded.</p>
          <Button variant="outline" onClick={activity.refetch}>
            Try again
          </Button>
        </div>
      )}

      {agents.length === 0 ? (
        <p className="text-muted">No agent yet. Create one above.</p>
      ) : (
        <ActiveMandates agents={active} activity={activity} now={now} />
      )}

      <div className="mt-18">
        {ended.length > 0 && <EndedStubs agents={ended} />}
        <LatestOrders orders={[...activity.ordersByMandate.values()].flat()} />
      </div>
    </>
  );
}

function LiveRoll({ agentName, run }: { agentName: string; run: Run }) {
  const { entries } = useRunEvents(run.id);
  return <TillRoll agentName={agentName} startedAt={run.startedAt} entries={entries} />;
}

function NewAgentPanel({ id, onCreated }: { id: string; onCreated: (name: string) => void }) {
  const categories = useCategories();
  return (
    <section id={id} aria-label="New agent" className="slip-edge mb-14 px-6 py-7">
      <h2 className="mb-5 text-heading font-medium tracking-tight">New agent</h2>
      <QueryState query={categories} resource="Categories" skeleton={<div className="h-40 animate-pulse bg-ground" />}>
        {(data) => <CreateAgentForm categories={data} onCreated={onCreated} />}
      </QueryState>
    </section>
  );
}

function ActiveMandates({ agents, activity, now }: { agents: Agent[]; activity: ReturnType<typeof useAgentActivity>; now: Date }) {
  const spent = agents.reduce((sum, agent) => sum + agent.mandate.spent.amountMinor, 0);
  const budget = agents.reduce((sum, agent) => sum + agent.mandate.totalBudget.amountMinor, 0);
  const currency = agents[0]?.mandate.totalBudget.currency ?? "EUR";
  return (
    <section aria-labelledby="active-mandates">
      <div className="mb-5.5 flex items-baseline justify-between gap-4">
        <h2 id="active-mandates" className="text-heading font-medium tracking-tight">
          Active mandates
        </h2>
        {agents.length > 0 && (
          <p className="text-sm text-muted tabular-nums">
            {formatMoney(spent, currency)} spent of {formatMoney(budget, currency)}
          </p>
        )}
      </div>
      {agents.length === 0 ? (
        <p className="text-muted">No active mandate. Create a new agent to start shopping.</p>
      ) : (
        <div className="grid items-start gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => (
            <MandateSlip
              key={agent.id}
              agent={agent}
              orders={activity.ordersByMandate.get(agent.mandate.id) ?? []}
              run={activity.runningByMandate.get(agent.mandate.id)}
              now={now}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function EndedStubs({ agents }: { agents: Agent[] }) {
  return (
    <section aria-labelledby="ended-mandates">
      <h2 id="ended-mandates" className="mb-5.5 text-heading font-medium tracking-tight">
        Ended
      </h2>
      <ul className="flex flex-col gap-3">
        {agents.map(({ id, name, mandate }) => (
          <li key={id} className="grid grid-cols-row gap-x-3 gap-y-0.5 bg-stub px-4.5 py-4 text-muted">
            <b className="font-medium text-fg">{name}</b>
            <span className="tabular-nums">{formatMoney(mandate.spent.amountMinor, mandate.spent.currency)}</span>
            <span className="text-sm">
              <Badge variant={mandate.status === "revoked" ? "destructive" : "secondary"}>
                {ENDED_LABEL[mandate.status as Exclude<MandateStatus, "active">]}
              </Badge>
            </span>
            <span className="text-sm tabular-nums">
              of {formatMoney(mandate.totalBudget.amountMinor, mandate.totalBudget.currency)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function LatestOrders({ orders }: { orders: Order[] }) {
  const latest = [...orders].sort((a, b) => b.placedAt.localeCompare(a.placedAt)).slice(0, LATEST_ORDERS);
  return (
    <section aria-labelledby="latest-orders" className="lg:col-start-2">
      <div className="mb-5.5 flex items-baseline justify-between">
        <h2 id="latest-orders" className="text-heading font-medium tracking-tight">
          Latest orders
        </h2>
        {orders.length > 0 && (
          <Link to="/orders" className="text-sm underline underline-offset-4">
            All {orders.length} orders
          </Link>
        )}
      </div>
      {latest.length === 0 ? (
        <p className="text-muted">Orders appear once an agent buys something.</p>
      ) : (
        <table className="w-full bg-paper text-left">
          <thead className="text-small text-muted">
            <tr>
              <th className="px-4.5 py-3.5 font-normal">Item</th>
              <th className="px-4.5 py-3.5 text-right font-normal">Total</th>
              <th className="hidden px-4.5 py-3.5 font-normal sm:table-cell">Merchant</th>
              <th className="hidden px-4.5 py-3.5 font-normal sm:table-cell">Placed</th>
            </tr>
          </thead>
          <tbody>
            {latest.map((order) => (
              <tr key={order.id} className="border-t border-rule">
                <td className="px-4.5 py-3.5">
                  <Link to={`/orders/${order.id}`} className="hover:underline">
                    {order.product.name}
                  </Link>
                </td>
                <td className="px-4.5 py-3.5 text-right tabular-nums">
                  {formatMoney(order.total.amountMinor, order.total.currency)}
                </td>
                <td className="hidden px-4.5 py-3.5 text-muted sm:table-cell">{order.merchant.name}</td>
                <td className="hidden px-4.5 py-3.5 text-muted sm:table-cell">{placedAt.format(new Date(order.placedAt))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
