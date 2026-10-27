import { Inject } from "@nestjs/common";
import { type IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { CLOCK, type Clock } from "../../shared/domain/clock";
import { AGENTS_SUMMARY_READ_MODEL, type AgentsSummaryReadModel, type AgentsSummaryView } from "./agents-summary-view";

export class GetAgentsSummaryQuery {
  constructor(readonly userId: string) {}
}

@QueryHandler(GetAgentsSummaryQuery)
export class GetAgentsSummaryHandler implements IQueryHandler<GetAgentsSummaryQuery, AgentsSummaryView> {
  constructor(
    @Inject(AGENTS_SUMMARY_READ_MODEL) private readonly summaries: AgentsSummaryReadModel,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  execute({ userId }: GetAgentsSummaryQuery): Promise<AgentsSummaryView> {
    return this.summaries.summarize(userId, this.clock.now());
  }
}
