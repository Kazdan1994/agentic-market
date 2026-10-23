import { Module } from "@nestjs/common";
import { CatalogModule } from "../catalog/catalog.module";
import { IdentityModule } from "../identity/identity.module";
import { CreateAgentHandler } from "./application/create-agent.handler";
import { GetAgentHandler } from "./application/get-agent.handler";
import { ListAgentsHandler } from "./application/list-agents.handler";
import { MANDATE_ACTIVITY_LOG } from "./domain/mandate-activity-log";
import { MANDATE_REPOSITORY } from "./domain/mandate-repository";
import { AgentsController } from "./infrastructure/http/agents.controller";
import { TypeOrmMandateActivityLog } from "./infrastructure/typeorm-mandate-activity-log";
import { TypeOrmMandateRepository } from "./infrastructure/typeorm-mandate-repository";

@Module({
  imports: [IdentityModule, CatalogModule],
  controllers: [AgentsController],
  providers: [
    CreateAgentHandler,
    ListAgentsHandler,
    GetAgentHandler,
    { provide: MANDATE_REPOSITORY, useClass: TypeOrmMandateRepository },
    { provide: MANDATE_ACTIVITY_LOG, useClass: TypeOrmMandateActivityLog },
  ],
  exports: [MANDATE_REPOSITORY, MANDATE_ACTIVITY_LOG],
})
export class MandatesModule {}
