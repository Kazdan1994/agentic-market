import { forwardRef, Module } from "@nestjs/common";
import { CatalogModule } from "../catalog/catalog.module";
import { IdentityModule } from "../identity/identity.module";
import { CreateAgentHandler } from "./application/create-agent.handler";
import { GetMandateHandler } from "./application/get-mandate.handler";
import { AGENTS_SUMMARY_READ_MODEL } from "./application/agents-summary-view";
import { GetAgentHandler } from "./application/get-agent.handler";
import { GetAgentsSummaryHandler } from "./application/get-agents-summary.handler";
import { ListAgentsHandler } from "./application/list-agents.handler";
import { MANDATE_ACTIVITY_LOG } from "./domain/mandate-activity-log";
import { MANDATE_REPOSITORY } from "./domain/mandate-repository";
import { ActivityInterceptor } from "./infrastructure/http/activity.interceptor";
import { AgentsController } from "./infrastructure/http/agents.controller";
import { MandateKeyGuard } from "./infrastructure/http/mandate-key.guard";
import { OwnMandateController } from "./infrastructure/http/own-mandate.controller";
import { UserOrKeyGuard } from "./infrastructure/http/user-or-key.guard";
import { TypeOrmAgentsSummaryReadModel } from "./infrastructure/typeorm-agents-summary-read-model";
import { TypeOrmMandateActivityLog } from "./infrastructure/typeorm-mandate-activity-log";
import { TypeOrmMandateRepository } from "./infrastructure/typeorm-mandate-repository";

@Module({
  imports: [IdentityModule, forwardRef(() => CatalogModule)],
  controllers: [AgentsController, OwnMandateController],
  providers: [
    CreateAgentHandler,
    ListAgentsHandler,
    GetAgentHandler,
    GetMandateHandler,
    GetAgentsSummaryHandler,
    MandateKeyGuard,
    ActivityInterceptor,
    UserOrKeyGuard,
    { provide: MANDATE_REPOSITORY, useClass: TypeOrmMandateRepository },
    { provide: MANDATE_ACTIVITY_LOG, useClass: TypeOrmMandateActivityLog },
    { provide: AGENTS_SUMMARY_READ_MODEL, useClass: TypeOrmAgentsSummaryReadModel },
  ],
  exports: [MANDATE_REPOSITORY, MANDATE_ACTIVITY_LOG, MandateKeyGuard, ActivityInterceptor, UserOrKeyGuard],
})
export class MandatesModule {}
