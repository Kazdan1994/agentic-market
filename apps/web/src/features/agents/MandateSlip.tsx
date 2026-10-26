import { useId } from "react";
import { Link } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Order } from "@/features/orders/useOrders";
import { StartRunForm } from "@/features/runs/StartRunForm";
import type { Run } from "@/features/runs/useRun";
import { daysUntil } from "./heroSentence";
import { formatMoney } from "./money";
import type { Agent } from "./useAgents";

const MAX_LINES = 5;
const endDate = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });

interface MandateSlipProps {
  agent: Agent;
  /** The mandate's orders, oldest first. */
  orders: readonly Order[];
  run?: Run;
  now: Date;
}

/** One active mandate, printed as a receipt that fills with its purchases (direction E). */
export function MandateSlip({ agent, orders, run, now }: MandateSlipProps) {
  const headingId = useId();
  const { mandate } = agent;
  const money = (amountMinor: number) => formatMoney(amountMinor, mandate.totalBudget.currency);
  const budget = mandate.totalBudget.amountMinor;
  const spentShare = Math.min(100, (mandate.spent.amountMinor / budget) * 100);
  const capShare = (mandate.perPurchaseCap.amountMinor / budget) * 100;
  const days = daysUntil(mandate.expiresAt, now);
  const lines = orders.slice(-MAX_LINES);
  const hidden = orders.length - lines.length;

  return (
    <article aria-labelledby={headingId} className="slip-edge px-5.5 pt-5.5 pb-6 transition-transform hover:-translate-y-0.5">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 id={headingId} className="truncate text-lg font-medium tracking-tight" title={agent.name}>
            {agent.name}
          </h3>
          <p className="font-print text-label text-faint">MANDATE Nº {mandate.id.slice(-4).toUpperCase()}</p>
          <p className="mt-1 flex flex-wrap gap-1.5 text-xs text-muted">
            {mandate.categories.map((category) => (
              <span key={category.slug}>{category.name}</span>
            ))}
          </p>
        </div>
        {run ? <Badge variant="live">Shopping now</Badge> : <Badge variant="success">Active</Badge>}
      </header>

      <div className="mt-5 mb-2.5 flex items-baseline justify-between">
        <span className="text-sm text-muted">Left</span>
        <b data-testid="left" className="text-figure font-medium tracking-display text-accent tabular-nums">
          {money(mandate.remaining.amountMinor)}
        </b>
      </div>

      <div
        role="img"
        aria-label={`${money(mandate.spent.amountMinor)} of ${money(budget)} spent, cap ${money(mandate.perPurchaseCap.amountMinor)} per purchase`}
        className="relative h-1.5 rounded-full bg-accent-pale"
      >
        <span className="absolute inset-y-0 left-0 rounded-l-full bg-fg" style={{ width: `${spentShare}%` }} />
        {capShare < 100 && <span className="absolute -inset-y-1.25 w-0.5 bg-fg" style={{ left: `${capShare}%` }} />}
      </div>
      <div className="mt-2 flex justify-between gap-3 text-print text-muted">
        <span>
          <span className="tabular-nums">{money(budget)}</span> budget ·{" "}
          <span className="tabular-nums">{money(mandate.perPurchaseCap.amountMinor)}</span> a purchase
        </span>
        <span className="whitespace-nowrap">
          {days > 0 && days <= 7 ? `ends in ${days} ${days === 1 ? "day" : "days"}` : `ends ${endDate.format(new Date(mandate.expiresAt))}`}
        </span>
      </div>

      <div className="mt-4.5 border-t border-dashed border-dots pt-3.5 font-print text-print leading-receipt">
        {lines.length === 0 ? (
          <ReceiptLine label="No purchase yet" amount={money(0)} muted />
        ) : (
          lines.map((order) => (
            <ReceiptLine key={order.id} label={order.product.name} amount={money(order.total.amountMinor)} testId="line" />
          ))
        )}
        {hidden > 0 && <p className="text-faint">+{hidden} more</p>}
        <div data-testid="spent" className="mt-1.5 flex gap-1.5 border-t border-dashed border-dots pt-1.5 font-bold">
          <span>SPENT</span>
          <i aria-hidden="true" className="mb-1.5 flex-1 border-b border-dotted border-dots" />
          <span>{money(mandate.spent.amountMinor)}</span>
        </div>
      </div>

      <div className="mt-5">
        {run ? (
          <Button asChild className="h-9">
            <Link to={`/runs/${run.id}`}>Watch run</Link>
          </Button>
        ) : (
          <StartRunForm mandateId={mandate.id} />
        )}
      </div>
    </article>
  );
}

interface ReceiptLineProps {
  label: string;
  amount: string;
  muted?: boolean;
  testId?: string;
}

function ReceiptLine({ label, amount, muted, testId }: ReceiptLineProps) {
  return (
    <div data-testid={testId} className={muted ? "flex gap-1.5 text-faint" : "flex gap-1.5"}>
      <span className="max-w-slip-label truncate" title={label}>
        {label}
      </span>
      <i aria-hidden="true" className="mb-1.5 flex-1 border-b border-dotted border-dots" />
      <span>{amount}</span>
    </div>
  );
}
