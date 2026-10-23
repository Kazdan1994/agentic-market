import { Inject, Injectable } from "@nestjs/common";
import { APP_CONFIG } from "../../../shared/config/app-config";
import type { AiStatus, AiStatusPort } from "../../../shared/domain/ai-status.port";
import { type OllamaConfig, ollamaTarget } from "./ollama-config";

/** `/health` must stay fast even when Ollama hangs. */
const STATUS_TIMEOUT_MS = 2_000;

interface PsResponse {
  models?: { name?: string; model?: string }[];
}

/** Reports whether Ollama has the model loaded, from `GET /api/ps` (research R5). */
@Injectable()
export class OllamaAiStatus implements AiStatusPort {
  constructor(@Inject(APP_CONFIG) private readonly config: OllamaConfig) {}

  async current(): Promise<AiStatus> {
    const target = ollamaTarget(this.config);
    if (!target) return "disabled";
    try {
      const res = await fetch(`${target.baseUrl}/api/ps`, { signal: AbortSignal.timeout(Math.min(STATUS_TIMEOUT_MS, this.config.AI_TIMEOUT_MS)) });
      if (!res.ok) return "unavailable";
      const body = (await res.json()) as PsResponse;
      return body.models?.some((m) => m.name === target.model || m.model === target.model) ? "warm" : "cold";
    } catch {
      return "unavailable";
    }
  }
}
