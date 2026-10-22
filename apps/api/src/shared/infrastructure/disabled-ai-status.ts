import { Injectable } from "@nestjs/common";
import type { AiStatus, AiStatusPort } from "../domain/ai-status.port";

/** Default until the Ollama adapter is bound (slice 8). */
@Injectable()
export class DisabledAiStatus implements AiStatusPort {
  async current(): Promise<AiStatus> {
    return "disabled";
  }
}
