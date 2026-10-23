import { AgentRun } from "../../src/agent/domain/agent-run";
import type { AgentRunRepository } from "../../src/agent/domain/agent-run-repository";
import type { RunLogEntry } from "../../src/agent/domain/run-log-entry";
import { DomainError } from "../../src/shared/errors/domain-error";

/** AgentRunRepository with the same one-running-run rule as the database index. */
export class InMemoryRuns implements AgentRunRepository {
  readonly runs = new Map<string, AgentRun>();
  readonly log: RunLogEntry[] = [];

  async insert(run: AgentRun): Promise<void> {
    if ([...this.runs.values()].some((r) => r.mandateId === run.mandateId && r.status === "running")) {
      throw new DomainError("RUN_ALREADY_IN_PROGRESS", "This agent is already working on a request.");
    }
    this.runs.set(run.id, run);
  }

  async complete(run: AgentRun): Promise<void> {
    if (this.runs.get(run.id)?.status !== "running") throw new Error(`Run ${run.id} was not running`);
    this.runs.set(run.id, run);
  }

  async findById(runId: string): Promise<AgentRun | null> {
    return this.runs.get(runId) ?? null;
  }

  async findRunning(): Promise<AgentRun[]> {
    return [...this.runs.values()].filter((r) => r.status === "running");
  }

  async listByMandate(mandateId: string): Promise<AgentRun[]> {
    return [...this.runs.values()]
      .filter((r) => r.mandateId === mandateId)
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime() || (a.id < b.id ? 1 : -1));
  }

  async appendLog(entry: RunLogEntry): Promise<void> {
    if (this.log.some((e) => e.runId === entry.runId && e.seq === entry.seq)) throw new Error("duplicate seq");
    this.log.push(entry);
  }

  async listLog(runId: string, afterSeq = 0): Promise<RunLogEntry[]> {
    return this.log.filter((e) => e.runId === runId && e.seq > afterSeq).sort((a, b) => a.seq - b.seq);
  }

  async lastSeq(runId: string): Promise<number> {
    return Math.max(0, ...this.log.filter((e) => e.runId === runId).map((e) => e.seq));
  }

  entriesOf(runId: string): RunLogEntry[] {
    return this.log.filter((e) => e.runId === runId).sort((a, b) => a.seq - b.seq);
  }

  /** Seeds a running run, e.g. one left behind by a restart. */
  seedRunning(input: Parameters<typeof AgentRun.start>[0]): AgentRun {
    const run = AgentRun.start(input);
    this.runs.set(run.id, run);
    return run;
  }
}
