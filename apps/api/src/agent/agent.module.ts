import { Module } from "@nestjs/common";
import { PinoLogger } from "nestjs-pino";
import { IdentityModule } from "../identity/identity.module";
import { MandatesModule } from "../mandates/mandates.module";
import { GetRunHandler } from "./application/get-run.handler";
import { InterruptedRunsRecovery } from "./application/interrupted-runs.recovery";
import { ListRunsHandler } from "./application/list-runs.handler";
import { BUILTIN_KEYS, RUN_LOGGER } from "./application/ports";
import { RunExecutor } from "./application/run-executor";
import { SelectionService } from "./application/selection.service";
import { StartRunHandler } from "./application/start-run.handler";
import { AGENT_RUN_REPOSITORY } from "./domain/agent-run-repository";
import { PRODUCT_SELECTOR } from "./domain/product-selector.port";
import { RuleBasedSelector } from "./domain/rule-based-selector";
import { STORE } from "./domain/store.port";
import { BuiltinKeyProvider } from "./infrastructure/builtin-key.provider";
import { AiModule } from "./infrastructure/ai/ai.module";
import { HttpStoreAdapter } from "./infrastructure/http-store.adapter";
import { RunsController } from "./infrastructure/http/runs.controller";
import { TypeOrmAgentRunRepository } from "./infrastructure/typeorm-agent-run-repository";

/**
 * The built-in agent. It has no catalog or checkout dependency: it reaches the store only
 * through STORE, an HTTP client of the public API (research R8).
 */
@Module({
  imports: [IdentityModule, MandatesModule, AiModule],
  controllers: [RunsController],
  providers: [
    StartRunHandler,
    RunExecutor,
    InterruptedRunsRecovery,
    GetRunHandler,
    ListRunsHandler,
    { provide: AGENT_RUN_REPOSITORY, useClass: TypeOrmAgentRunRepository },
    { provide: STORE, useClass: HttpStoreAdapter },
    { provide: BUILTIN_KEYS, useClass: BuiltinKeyProvider },
    RuleBasedSelector,
    { provide: PRODUCT_SELECTOR, useClass: SelectionService },
    {
      provide: RUN_LOGGER,
      inject: [PinoLogger],
      useFactory: (logger: PinoLogger) => {
        logger.setContext("AgentRun");
        return { info: (obj: object, msg: string) => logger.info(obj, msg), error: (obj: object, msg: string) => logger.error(obj, msg) };
      },
    },
  ],
  exports: [AGENT_RUN_REPOSITORY],
})
export class AgentModule {}
