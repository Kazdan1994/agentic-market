import type { MoneyView } from "./mandate-view";

/** A mandate counts as ending soon when it ends within this many days. */
export const ENDING_SOON_DAYS = 7;

export interface EndingSoonView {
  agentId: string;
  agentName: string;
  expiresAt: string;
  /** Whole days left, rounded up: anything later today counts as one. */
  days: number;
}

export interface RunningRunView {
  mandateId: string;
  runId: string;
  agentName: string;
}

/** What the caller's active mandates add up to, computed in SQL. */
export interface AgentsSummaryView {
  remaining: MoneyView;
  activeCount: number;
  endingSoon: EndingSoonView | null;
  running: RunningRunView[];
}

export interface AgentsSummaryReadModel {
  summarize(userId: string, now: Date): Promise<AgentsSummaryView>;
}

export const AGENTS_SUMMARY_READ_MODEL = Symbol("AgentsSummaryReadModel");
