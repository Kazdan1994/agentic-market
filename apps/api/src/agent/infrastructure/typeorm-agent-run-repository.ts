import { Injectable } from "@nestjs/common";
import { DataSource, MoreThan, QueryFailedError } from "typeorm";
import { DomainError } from "../../shared/errors/domain-error";
import { ErrorCode } from "../../shared/errors/error-codes";
import { AgentRun } from "../domain/agent-run";
import type { AgentRunRepository } from "../domain/agent-run-repository";
import type { RunLogEntry } from "../domain/run-log-entry";
import { AgentRunEntity } from "./agent-run.entity";
import { RunLogEntryEntity } from "./run-log-entry.entity";

const ONE_RUNNING_INDEX = "agent_runs_one_running";

function isOneRunningViolation(error: unknown): boolean {
  const driver = error instanceof QueryFailedError ? (error.driverError as { code?: string; constraint?: string }) : undefined;
  return driver?.code === "23505" && driver.constraint === ONE_RUNNING_INDEX;
}

const toRow = (run: AgentRun): AgentRunEntity => ({
  id: run.id,
  mandateId: run.mandateId,
  userId: run.userId,
  request: run.request,
  status: run.status,
  outcome: run.outcome,
  strategy: run.strategy,
  fallbackReason: run.fallbackReason,
  orderId: run.orderId,
  startedAt: run.startedAt,
  endedAt: run.endedAt,
  correlationId: run.correlationId,
});

const toEntry = (row: RunLogEntryEntity): RunLogEntry => ({
  runId: row.runId,
  seq: row.seq,
  at: row.at,
  step: row.step,
  message: row.message,
  productId: row.productId,
  data: row.data as Record<string, unknown>,
});

@Injectable()
export class TypeOrmAgentRunRepository implements AgentRunRepository {
  constructor(private readonly dataSource: DataSource) {}

  async insert(run: AgentRun): Promise<void> {
    try {
      await this.dataSource.getRepository(AgentRunEntity).insert(toRow(run));
    } catch (error) {
      if (isOneRunningViolation(error)) {
        throw new DomainError(ErrorCode.RUN_ALREADY_IN_PROGRESS, "This agent is already working on a request.");
      }
      throw error;
    }
  }

  async complete(run: AgentRun): Promise<void> {
    const { status, outcome, strategy, fallbackReason, orderId, endedAt } = toRow(run);
    const result = await this.dataSource
      .getRepository(AgentRunEntity)
      .update({ id: run.id, status: "running" }, { status, outcome, strategy, fallbackReason, orderId, endedAt });
    if (result.affected !== 1) throw new Error(`Run ${run.id} was not running`);
  }

  async findById(runId: string): Promise<AgentRun | null> {
    const row = await this.dataSource.getRepository(AgentRunEntity).findOneBy({ id: runId });
    return row ? AgentRun.restore(row) : null;
  }

  async findRunning(): Promise<AgentRun[]> {
    const rows = await this.dataSource.getRepository(AgentRunEntity).find({ where: { status: "running" }, order: { startedAt: "ASC" } });
    return rows.map((row) => AgentRun.restore(row));
  }

  async appendLog(entry: RunLogEntry): Promise<void> {
    await this.dataSource.getRepository(RunLogEntryEntity).insert({ ...entry, data: { ...entry.data } });
  }

  async listLog(runId: string, afterSeq = 0): Promise<RunLogEntry[]> {
    const rows = await this.dataSource
      .getRepository(RunLogEntryEntity)
      .find({ where: { runId, seq: MoreThan(afterSeq) }, order: { seq: "ASC" } });
    return rows.map(toEntry);
  }

  async lastSeq(runId: string): Promise<number> {
    const [row]: { max: number | null }[] = await this.dataSource.query(
      "SELECT max(seq) AS max FROM run_log_entries WHERE run_id = $1",
      [runId],
    );
    return row?.max ?? 0;
  }
}
