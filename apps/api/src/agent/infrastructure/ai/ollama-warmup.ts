import { Inject, Injectable, type OnApplicationBootstrap } from "@nestjs/common";
import { APP_CONFIG } from "../../../shared/config/app-config";
import { KEEP_ALIVE, type OllamaConfig, ollamaTarget } from "./ollama-config";

export type { OllamaConfig } from "./ollama-config";

export interface WarmupLogger {
  warn(obj: object, msg?: string): void;
}

export const WARMUP_LOGGER = Symbol("WarmupLogger");

/**
 * Loads the model at boot so the first run does not pay the cold start (research R5).
 * The request runs in the background: startup never waits for it, and a failure is only logged.
 */
@Injectable()
export class OllamaWarmup implements OnApplicationBootstrap {
  constructor(
    @Inject(APP_CONFIG) private readonly config: OllamaConfig,
    @Inject(WARMUP_LOGGER) private readonly logger: WarmupLogger,
  ) {}

  onApplicationBootstrap(): void {
    const target = ollamaTarget(this.config);
    if (!target) return;
    fetch(`${target.baseUrl}/api/generate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model: target.model, keep_alive: KEEP_ALIVE }),
    })
      .then((res) => {
        if (!res.ok) this.logger.warn({ model: target.model, status: res.status }, "AI model warm-up failed");
      })
      .catch((error: unknown) => this.logger.warn({ model: target.model, err: error }, "AI model warm-up failed"));
  }
}
