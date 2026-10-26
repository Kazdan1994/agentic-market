import { Inject } from "@nestjs/common";
import { type IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { CATEGORY_REPOSITORY, type CategoryRepository } from "../../catalog/domain/category";
import { CLOCK, type Clock } from "../../shared/domain/clock";
import { DomainError } from "../../shared/errors/domain-error";
import { ErrorCode } from "../../shared/errors/error-codes";
import { MANDATE_REPOSITORY, type MandateRepository } from "../domain/mandate-repository";
import { type AgentView, toAgentView } from "./mandate-view";

export class GetAgentQuery {
  constructor(
    readonly userId: string,
    readonly agentId: string,
  ) {}
}

@QueryHandler(GetAgentQuery)
export class GetAgentHandler implements IQueryHandler<GetAgentQuery, AgentView> {
  constructor(
    @Inject(MANDATE_REPOSITORY) private readonly mandates: MandateRepository,
    @Inject(CATEGORY_REPOSITORY) private readonly categories: CategoryRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute({ userId, agentId }: GetAgentQuery): Promise<AgentView> {
    const found = await this.mandates.findAgentById(agentId);
    // Another user's agent is reported as missing, so ids cannot be probed.
    if (!found || found.agent.userId !== userId) {
      throw new DomainError(ErrorCode.NOT_FOUND, "Agent not found.");
    }
    return toAgentView(found.agent, found.mandate, await this.categories.listAll(), this.clock.now());
  }
}
