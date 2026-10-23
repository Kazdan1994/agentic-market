import type { AgentRun } from "./agent-run";
import type { RunLogEntry } from "./run-log-entry";

export interface AgentRunRepository {
  /** Raises RUN_ALREADY_IN_PROGRESS when the mandate already has a running run (FR-010). */
  insert(run: AgentRun): Promise<void>;
  /** Stores the completion of a running run. */
  complete(run: AgentRun): Promise<void>;
  findById(runId: string): Promise<AgentRun | null>;
  findRunning(): Promise<AgentRun[]>;
  appendLog(entry: RunLogEntry): Promise<void>;
  /** Entries in seq order, optionally only those after `afterSeq` (SSE replay). */
  listLog(runId: string, afterSeq?: number): Promise<RunLogEntry[]>;
  lastSeq(runId: string): Promise<number>;
}

export const AGENT_RUN_REPOSITORY = Symbol("AgentRunRepository");
