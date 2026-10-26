import { Inject } from "@nestjs/common";
import { type IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { CATEGORY_REPOSITORY, type CategoryRepository } from "../../catalog/domain/category";
import { CLOCK, type Clock } from "../../shared/domain/clock";
import { MANDATE_REPOSITORY, type MandateRepository } from "../domain/mandate-repository";
import { type AgentView, toAgentView } from "./mandate-view";

export class ListAgentsQuery {
  constructor(readonly userId: string) {}
}

@QueryHandler(ListAgentsQuery)
export class ListAgentsHandler implements IQueryHandler<ListAgentsQuery, AgentView[]> {
  constructor(
    @Inject(MANDATE_REPOSITORY) private readonly mandates: MandateRepository,
    @Inject(CATEGORY_REPOSITORY) private readonly categories: CategoryRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute({ userId }: ListAgentsQuery): Promise<AgentView[]> {
    const [rows, allCategories] = await Promise.all([this.mandates.listByUser(userId), this.categories.listAll()]);
    const now = this.clock.now();
    return rows.map(({ agent, mandate }) => toAgentView(agent, mandate, allCategories, now));
  }
}
