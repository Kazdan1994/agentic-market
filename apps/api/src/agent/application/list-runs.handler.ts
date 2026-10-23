import { Inject } from "@nestjs/common";
import { type IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { MANDATE_REPOSITORY, type MandateRepository } from "../../mandates/domain/mandate-repository";
import { DomainError } from "../../shared/errors/domain-error";
import { ErrorCode } from "../../shared/errors/error-codes";
import { AGENT_RUN_REPOSITORY, type AgentRunRepository } from "../domain/agent-run-repository";
import { type RunView, toRunView } from "./run-view";

export class ListRunsQuery {
  constructor(
    readonly userId: string,
    readonly mandateId: string,
  ) {}
}

@QueryHandler(ListRunsQuery)
export class ListRunsHandler implements IQueryHandler<ListRunsQuery, RunView[]> {
  constructor(
    @Inject(MANDATE_REPOSITORY) private readonly mandates: MandateRepository,
    @Inject(AGENT_RUN_REPOSITORY) private readonly runs: AgentRunRepository,
  ) {}

  async execute({ userId, mandateId }: ListRunsQuery): Promise<RunView[]> {
    const mandate = await this.mandates.findById(mandateId);
    if (!mandate || mandate.userId !== userId) throw new DomainError(ErrorCode.NOT_FOUND, "Mandate not found.");
    return (await this.runs.listByMandate(mandateId)).map(toRunView);
  }
}
