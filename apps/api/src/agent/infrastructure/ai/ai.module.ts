import { Global, Module } from "@nestjs/common";
import { PinoLogger } from "nestjs-pino";
import { AI_STATUS } from "../../../shared/domain/ai-status.port";
import { AI_SELECTOR } from "../../domain/ai-selector.port";
import { RuleBasedSelector } from "../../domain/rule-based-selector";
import { OllamaAiStatus } from "./ollama-ai-status.adapter";
import { OllamaProductSelector } from "./ollama-product-selector";
import { OllamaWarmup, WARMUP_LOGGER } from "./ollama-warmup";

/**
 * Local AI access. Global so that the shared `/health` endpoint can read the AI state
 * without the shared module depending on the agent module; it also provides the AI selector.
 */
@Global()
@Module({
  providers: [
    OllamaWarmup,
    { provide: AI_STATUS, useClass: OllamaAiStatus },
    RuleBasedSelector,
    { provide: AI_SELECTOR, useClass: OllamaProductSelector },
    {
      provide: WARMUP_LOGGER,
      inject: [PinoLogger],
      useFactory: (logger: PinoLogger) => {
        logger.setContext("OllamaWarmup");
        return { warn: (obj: object, msg?: string) => logger.warn(obj, msg) };
      },
    },
  ],
  exports: [AI_STATUS, AI_SELECTOR],
})
export class AiModule {}
