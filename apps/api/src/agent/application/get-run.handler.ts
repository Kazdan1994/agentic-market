import { Inject } from "@nestjs/common";
import { type IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { DomainError } from "../../shared/errors/domain-error";
import { ErrorCode } from "../../shared/errors/error-codes";
import { AGENT_RUN_REPOSITORY, type AgentRunRepository } from "../domain/agent-run-repository";
import { type RunView, toRunView } from "./run-view";

export class GetRunQuery {
  constructor(
    readonly userId: string,
    readonly runId: string,
  ) {}
}

@QueryHandler(GetRunQuery)
export class GetRunHandler implements IQueryHandler<GetRunQuery, RunView> {
  constructor(@Inject(AGENT_RUN_REPOSITORY) private readonly runs: AgentRunRepository) {}

  async execute({ userId, runId }: GetRunQuery): Promise<RunView> {
    const run = await this.runs.findById(runId);
    // Other users' runs are reported as missing (FR-022).
    if (!run || run.userId !== userId) throw new DomainError(ErrorCode.NOT_FOUND, "Run not found.");
    return toRunView(run);
  }
}
