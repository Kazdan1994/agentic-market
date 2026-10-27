import type { MoneyView } from "./mandate-view";

export const ENDING_SOON_DAYS = 7;

export interface EndingSoonView {
  agentId: string;
  agentName: string;
  expiresAt: string;
  days: number;
}

export interface RunningRunView {
  mandateId: string;
  runId: string;
  agentName: string;
}

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
