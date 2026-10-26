import type { Run } from "@/features/runs/useRun";
import { formatMoney } from "./money";
import type { Agent } from "./useAgents";

const DAY_MS = 86_400_000;
const SOON_DAYS = 7;

/** Whole days until `iso`, rounded up, so anything later today counts as one day. */
export function daysUntil(iso: string, now: Date): number {
  return Math.ceil((new Date(iso).getTime() - now.getTime()) / DAY_MS);
}

/** What the active mandates can still spend, formatted: "249.10 EUR". */
export function leftToSpend(agents: readonly Agent[]): string {
  const active = agents.filter((agent) => agent.mandate.status === "active");
  const left = active.reduce((sum, agent) => sum + agent.mandate.remaining.amountMinor, 0);
  return formatMoney(left, active[0]?.mandate.remaining.currency ?? "EUR");
}

/**
 * The Agents page's opening sentence, written from the data only (research R18):
 * what is left across active mandates, then who is shopping, then what ends soon.
 */
export function heroSentence(agents: readonly Agent[], runningByMandate: ReadonlyMap<string, Run>, now: Date): string {
  const active = agents.filter((agent) => agent.mandate.status === "active");
  const count = active.length;
  const sentences = [`${leftToSpend(agents)} left to spend across ${count} ${count === 1 ? "mandate" : "mandates"}.`];

  const shopping = active.find((agent) => runningByMandate.has(agent.mandate.id));
  if (shopping) sentences.push(`${shopping.name} is shopping now.`);

  const ending = active
    .map((agent) => ({ agent, days: daysUntil(agent.mandate.expiresAt, now) }))
    .filter(({ days }) => days > 0 && days <= SOON_DAYS)
    .sort((a, b) => a.days - b.days)[0];
  if (ending) sentences.push(`${ending.agent.name} ends in ${ending.days} ${ending.days === 1 ? "day" : "days"}.`);

  return sentences.join(" ");
}
