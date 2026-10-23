import { Inject, Injectable } from "@nestjs/common";
import { APP_CONFIG } from "../../../shared/config/app-config";
import type { AiFallbackReason, AiSelectionResult, AiSelectorPort } from "../../domain/ai-selector.port";
import type { Candidate } from "../../domain/candidate";
import type { SelectionEvaluation } from "../../domain/product-selector.port";
import { RuleBasedSelector } from "../../domain/rule-based-selector";
import { AI_SELECTION_JSON_SCHEMA, AiSelectionAnswer } from "./ai-selection.schema";
import { KEEP_ALIVE, type OllamaConfig, ollamaTarget } from "./ollama-config";
import { selectionPrompt } from "./prompt";

class AiFallback extends Error {
  constructor(readonly reason: AiFallbackReason) {
    super(reason);
  }
}

/**
 * Asks the local model to choose among the kept candidates through Ollama's chat API
 * (research R5): one call, no retries, every failure mapped to a fallback reason.
 */
@Injectable()
export class OllamaProductSelector implements AiSelectorPort {
  constructor(
    @Inject(APP_CONFIG) private readonly config: OllamaConfig,
    private readonly rules: RuleBasedSelector,
  ) {}

  async select(request: string, kept: readonly Candidate[]): Promise<AiSelectionResult> {
    try {
      const answer = await this.ask(request, kept);
      if (answer.chosenProductId !== null && !kept.some((c) => c.productId === answer.chosenProductId)) {
        return { fallback: "ineligible_choice" };
      }
      return {
        selection: {
          productId: answer.chosenProductId,
          reason: answer.reason,
          evaluations: await this.evaluations(request, kept, answer),
          strategy: "ai",
          fallbackReason: null,
        },
      };
    } catch (error) {
      if (error instanceof AiFallback) return { fallback: error.reason };
      throw error;
    }
  }

  private async ask(request: string, kept: readonly Candidate[]): Promise<AiSelectionAnswer> {
    const target = ollamaTarget(this.config);
    if (!target) throw new AiFallback("unavailable");
    const response = await fetch(`${target.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: target.model,
        messages: [{ role: "user", content: selectionPrompt(request, kept) }],
        stream: false,
        think: false,
        format: AI_SELECTION_JSON_SCHEMA,
        options: { temperature: 0 },
        keep_alive: KEEP_ALIVE,
      }),
      signal: AbortSignal.timeout(this.config.AI_TIMEOUT_MS),
    }).catch((error: unknown) => {
      throw new AiFallback(isTimeout(error) ? "timeout" : "unavailable");
    });
    if (!response.ok) throw new AiFallback("api_error");
    const body = await response.json().catch((error: unknown) => {
      throw new AiFallback(isTimeout(error) ? "timeout" : "api_error");
    });
    return parseAnswer(body);
  }

  /** The AI's verdicts for known candidates, with the rule-based verdict for any it left out. */
  private async evaluations(request: string, kept: readonly Candidate[], answer: AiSelectionAnswer): Promise<SelectionEvaluation[]> {
    const byAi = new Map(answer.evaluations.map((e) => [e.productId, e]));
    const missing = kept.some((c) => !byAi.has(c.productId));
    const byRules = missing ? new Map((await this.rules.select(request, kept)).evaluations.map((e) => [e.productId, e])) : new Map();
    return kept.flatMap((c): SelectionEvaluation[] => {
      const ai = byAi.get(c.productId);
      if (ai) return [{ productId: ai.productId, verdict: ai.verdict, reason: ai.reason }];
      const rule = byRules.get(c.productId);
      return rule ? [{ ...rule, notEvaluatedByAi: true }] : [];
    });
  }
}

function isTimeout(error: unknown): boolean {
  return error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
}

function parseAnswer(body: unknown): AiSelectionAnswer {
  const content = (body as { message?: { content?: unknown } } | null)?.message?.content;
  if (typeof content !== "string") throw new AiFallback("unusable_answer");
  let json: unknown;
  try {
    json = JSON.parse(content);
  } catch {
    throw new AiFallback("unusable_answer");
  }
  const parsed = AiSelectionAnswer.safeParse(json);
  if (!parsed.success) throw new AiFallback("unusable_answer");
  return parsed.data;
}
