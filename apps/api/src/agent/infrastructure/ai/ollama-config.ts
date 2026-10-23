import type { AppConfig } from "../../../shared/config/app-config";

export type OllamaConfig = Pick<AppConfig, "AGENT_SELECTION_MODE" | "OLLAMA_BASE_URL" | "AI_MODEL" | "AI_TIMEOUT_MS">;

/** The settings needed to call Ollama, or null when AI selection is off (research R5). */
export function ollamaTarget(config: OllamaConfig): { baseUrl: string; model: string } | null {
  if (config.AGENT_SELECTION_MODE === "rules" || !config.OLLAMA_BASE_URL || !config.AI_MODEL) return null;
  return { baseUrl: config.OLLAMA_BASE_URL.replace(/\/+$/, ""), model: config.AI_MODEL };
}

/** How long Ollama keeps the model loaded after each call. */
export const KEEP_ALIVE = "30m";
