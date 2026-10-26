import { Inject } from "@nestjs/common";
import { type IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { DomainError } from "../../shared/errors/domain-error";
import { ErrorCode } from "../../shared/errors/error-codes";
import { AGENT_RUN_REPOSITORY, type AgentRunRepository } from "../domain/agent-run-repository";
import type { RunLogEntry, RunStep } from "../domain/run-log-entry";

export class GetRunLogQuery {
  constructor(
    readonly userId: string,
    readonly runId: string,
  ) {}
}

export interface LogEntryView {
  seq: number;
  at: string;
  step: RunStep;
  message: string;
  productId: string | null;
  data: Readonly<Record<string, unknown>>;
}

/** Shapes a log entry like the `LogEntry` schema in contracts/openapi.yaml. */
export function toLogEntryView(entry: RunLogEntry): LogEntryView {
  return {
    seq: entry.seq,
    at: entry.at.toISOString(),
    step: entry.step,
    message: entry.message,
    productId: entry.productId,
    data: entry.data,
  };
}

@QueryHandler(GetRunLogQuery)
export class GetRunLogHandler implements IQueryHandler<GetRunLogQuery, LogEntryView[]> {
  constructor(@Inject(AGENT_RUN_REPOSITORY) private readonly runs: AgentRunRepository) {}

  async execute({ userId, runId }: GetRunLogQuery): Promise<LogEntryView[]> {
    const run = await this.runs.findById(runId);
    // Other users' runs are reported as missing (FR-022).
    if (!run || run.userId !== userId) throw new DomainError(ErrorCode.NOT_FOUND, "Run not found.");
    const entries = await this.runs.listLog(runId);
    return entries.map(toLogEntryView);
  }
}
