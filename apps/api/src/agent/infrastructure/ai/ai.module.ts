import { Global, Module } from "@nestjs/common";
import { PinoLogger } from "nestjs-pino";
import { AI_STATUS } from "../../../shared/domain/ai-status.port";
import { OllamaAiStatus } from "./ollama-ai-status.adapter";
import { OllamaWarmup, WARMUP_LOGGER } from "./ollama-warmup";

/**
 * Local AI access. Global so that the shared `/health` endpoint can read the AI state
 * without the shared module depending on the agent module.
 */
@Global()
@Module({
  providers: [
    OllamaWarmup,
    { provide: AI_STATUS, useClass: OllamaAiStatus },
    {
      provide: WARMUP_LOGGER,
      inject: [PinoLogger],
      useFactory: (logger: PinoLogger) => {
        logger.setContext("OllamaWarmup");
        return { warn: (obj: object, msg?: string) => logger.warn(obj, msg) };
      },
    },
  ],
  exports: [AI_STATUS],
})
export class AiModule {}
