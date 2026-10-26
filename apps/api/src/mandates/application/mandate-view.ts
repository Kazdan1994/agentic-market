import type { Category } from "../../catalog/domain/category";
import type { Agent } from "../domain/agent";
import type { Mandate } from "../domain/mandate";
import type { MandateStatus } from "../domain/mandate-status";

export interface MoneyView {
  amountMinor: number;
  currency: string;
}

export interface MandateView {
  id: string;
  status: MandateStatus;
  perPurchaseCap: MoneyView;
  totalBudget: MoneyView;
  spent: MoneyView;
  remaining: MoneyView;
  categories: { slug: string; name: string }[];
  expiresAt: string;
  revokedAt: string | null;
  createdAt: string;
}

export interface AgentView {
  id: string;
  name: string;
  mandate: MandateView;
  createdAt: string;
}

/** Shapes a mandate like the `Mandate` schema in contracts/openapi.yaml. */
export function toMandateView(mandate: Mandate, allCategories: readonly Category[], now: Date): MandateView {
  const money = (amountMinor: number): MoneyView => ({ amountMinor, currency: mandate.currency });
  const byId = new Map(allCategories.map((c) => [c.id, c]));
  return {
    id: mandate.id,
    status: mandate.status(now),
    perPurchaseCap: money(mandate.perPurchaseCapMinor),
    totalBudget: money(mandate.totalBudgetMinor),
    spent: money(mandate.spentMinor),
    remaining: money(mandate.remainingMinor),
    categories: mandate.categoryIds.flatMap((id) => {
      const category = byId.get(id);
      return category ? [{ slug: category.slug, name: category.name }] : [];
    }),
    expiresAt: mandate.expiresAt.toISOString(),
    revokedAt: mandate.revokedAt?.toISOString() ?? null,
    createdAt: mandate.createdAt.toISOString(),
  };
}

export function toAgentView(agent: Agent, mandate: Mandate, allCategories: readonly Category[], now: Date): AgentView {
  return {
    id: agent.id,
    name: agent.name,
    mandate: toMandateView(mandate, allCategories, now),
    createdAt: agent.createdAt.toISOString(),
  };
}
