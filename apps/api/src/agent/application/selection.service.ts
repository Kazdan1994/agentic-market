import { Inject, Injectable, Optional } from "@nestjs/common";
import { APP_CONFIG, type AppConfig } from "../../shared/config/app-config";
import { AI_SELECTOR, type AiSelectorPort } from "../domain/ai-selector.port";
import type { Candidate } from "../domain/candidate";
import type { ProductSelectorPort, Selection } from "../domain/product-selector.port";
import { RuleBasedSelector } from "../domain/rule-based-selector";

export type SelectionConfig = Pick<AppConfig, "AGENT_SELECTION_MODE" | "OLLAMA_BASE_URL" | "AI_MODEL">;

/**
 * Picks the selection strategy (FR-009, FR-009b): the local AI when it is configured,
 * otherwise or on any AI failure the rule-based selector, with the reason recorded.
 */
@Injectable()
export class SelectionService implements ProductSelectorPort {
  constructor(
    @Inject(APP_CONFIG) private readonly config: SelectionConfig,
    private readonly rules: RuleBasedSelector,
    @Optional() @Inject(AI_SELECTOR) private readonly ai: AiSelectorPort | null = null,
  ) {}

  async select(request: string, kept: readonly Candidate[]): Promise<Selection> {
    if (kept.length === 0) return this.fallback(request, kept, "no_eligible_candidates");
    if (this.config.AGENT_SELECTION_MODE === "rules") return this.fallback(request, kept, "forced_rules");
    if (!this.ai || !this.config.OLLAMA_BASE_URL || !this.config.AI_MODEL) return this.fallback(request, kept, "not_configured");

    const result = await this.ai.select(request, kept);
    if ("selection" in result) return result.selection;
    return this.fallback(request, kept, result.fallback);
  }

  private async fallback(request: string, kept: readonly Candidate[], reason: Selection["fallbackReason"]): Promise<Selection> {
    return { ...(await this.rules.select(request, kept)), fallbackReason: reason };
  }
}
