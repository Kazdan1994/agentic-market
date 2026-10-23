import type { AgentRun } from "../domain/agent-run";
import type { RunLogEntry } from "../domain/run-log-entry";

/** Published once a decision log entry is stored (committed), never before. */
export class RunLogAppendedEvent {
  constructor(readonly entry: RunLogEntry) {}
}

/** Published once a run is stored as completed, after its last log entry. */
export class RunCompletedEvent {
  constructor(readonly run: AgentRun) {}
}

export type RunLogEvent = RunLogAppendedEvent | RunCompletedEvent;
