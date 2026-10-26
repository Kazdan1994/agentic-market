import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StartRunForm } from "@/features/runs/StartRunForm";
import { CreateAgentForm } from "./CreateAgentForm";
import { formatMoney } from "./money";
import { type Agent, useAgents, useCategories } from "./useAgents";

type MandateStatus = Agent["mandate"]["status"];

const STATUS: Record<MandateStatus, { label: string; variant: "success" | "secondary" | "destructive" }> = {
  active: { label: "Active", variant: "success" },
  exhausted: { label: "Budget used up", variant: "secondary" },
  expired: { label: "Expired", variant: "secondary" },
  revoked: { label: "Revoked", variant: "destructive" },
};

const dateTime = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" });

export function AgentsPage() {
  const agents = useAgents();
  const categories = useCategories();

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-8">
      <h1 className="text-2xl font-semibold">Agents</h1>
      <Card>
        <CardHeader>
          <CardTitle>New agent</CardTitle>
        </CardHeader>
        <CardContent>
          {categories.data && <CreateAgentForm categories={categories.data} />}
          {categories.isError && <p role="alert">Categories could not be loaded. Please reload.</p>}
        </CardContent>
      </Card>
      <AgentList agents={agents.data} isError={agents.isError} />
    </main>
  );
}

function AgentList({ agents, isError }: { agents: Agent[] | undefined; isError: boolean }) {
  if (isError) return <p role="alert">Agents could not be loaded. Please reload.</p>;
  if (!agents) return null;
  if (agents.length === 0) return <p className="text-neutral-600">No agent yet. Create one above.</p>;
  return (
    <section className="grid gap-4 sm:grid-cols-2">
      {agents.map((agent) => (
        <AgentCard key={agent.id} agent={agent} />
      ))}
    </section>
  );
}

function AgentCard({ agent }: { agent: Agent }) {
  const { mandate } = agent;
  const status = STATUS[mandate.status];
  return (
    <Card>
      <article>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>{agent.name}</CardTitle>
          <Badge variant={status.variant}>{status.label}</Badge>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <Row label="Per purchase" value={formatMoney(mandate.perPurchaseCap.amountMinor, mandate.perPurchaseCap.currency)} />
            <Row label="Total budget" value={formatMoney(mandate.totalBudget.amountMinor, mandate.totalBudget.currency)} />
            <Row label="Spent" value={formatMoney(mandate.spent.amountMinor, mandate.spent.currency)} />
            <Row label="Remaining" value={formatMoney(mandate.remaining.amountMinor, mandate.remaining.currency)} />
            <Row label="Expires" value={dateTime.format(new Date(mandate.expiresAt))} />
          </dl>
          <div className="mt-3 flex flex-wrap gap-1">
            {mandate.categories.map((category) => (
              <Badge key={category.slug} variant="secondary">
                {category.name}
              </Badge>
            ))}
          </div>
          {mandate.status === "active" && <StartRunForm mandateId={mandate.id} />}
        </CardContent>
      </article>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-neutral-500">{label}</dt>
      <dd>{value}</dd>
    </>
  );
}
