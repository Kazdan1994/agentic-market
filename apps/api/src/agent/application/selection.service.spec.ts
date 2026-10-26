import { describe, expect, it } from "vitest";
import { candidate } from "../../../test/support/candidates";
import type { AiSelectionResult, AiSelectorPort } from "../domain/ai-selector.port";
import { RuleBasedSelector } from "../domain/rule-based-selector";
import { SelectionService, type SelectionConfig } from "./selection.service";

const KEPT = [candidate({ productId: "p1", priceMinor: 9_900 }), candidate({ productId: "p2", priceMinor: 7_900 })];
const CONFIGURED: SelectionConfig = { AGENT_SELECTION_MODE: "auto", OLLAMA_BASE_URL: "http://localhost:11434", AI_MODEL: "gemma4:e2b" };

function ai(result: AiSelectionResult): AiSelectorPort & { calls: number } {
  return {
    calls: 0,
    async select() {
      this.calls += 1;
      return result;
    },
  };
}

const aiChoice: AiSelectionResult = {
  selection: { productId: "p1", reason: "Best match.", evaluations: [], strategy: "ai", fallbackReason: null },
};

describe("SelectionService", () => {
  it("uses the rules when AGENT_SELECTION_MODE=rules", async () => {
    const model = ai(aiChoice);
    const result = await new SelectionService({ ...CONFIGURED, AGENT_SELECTION_MODE: "rules" }, new RuleBasedSelector(), model).select("earbuds", KEPT);
    expect(result).toMatchObject({ strategy: "rules", fallbackReason: "forced_rules", productId: "p2" });
    expect(model.calls).toBe(0);
  });

  it.each([
    ["OLLAMA_BASE_URL", { OLLAMA_BASE_URL: undefined }],
    ["AI_MODEL", { AI_MODEL: undefined }],
  ])("uses the rules with not_configured when %s is unset", async (_name, over) => {
    const model = ai(aiChoice);
    const result = await new SelectionService({ ...CONFIGURED, ...over }, new RuleBasedSelector(), model).select("earbuds", KEPT);
    expect(result).toMatchObject({ strategy: "rules", fallbackReason: "not_configured" });
    expect(model.calls).toBe(0);
  });

  it("uses the AI's choice when it answers", async () => {
    const result = await new SelectionService(CONFIGURED, new RuleBasedSelector(), ai(aiChoice)).select("earbuds", KEPT);
    expect(result).toMatchObject({ strategy: "ai", fallbackReason: null, productId: "p1" });
  });

  it.each(["unavailable", "timeout", "api_error", "unusable_answer", "ineligible_choice"] as const)(
    "falls back to the rules on %s",
    async (fallback) => {
      const result = await new SelectionService(CONFIGURED, new RuleBasedSelector(), ai({ fallback })).select("earbuds", KEPT);
      expect(result).toMatchObject({ strategy: "rules", fallbackReason: fallback, productId: "p2" });
    },
  );

  it("does not ask the AI when nothing is kept, recording no_eligible_candidates", async () => {
    const model = ai(aiChoice);
    const result = await new SelectionService(CONFIGURED, new RuleBasedSelector(), model).select("earbuds", []);
    expect(result).toMatchObject({ productId: null, strategy: "rules", fallbackReason: "no_eligible_candidates" });
    expect(model.calls).toBe(0);
  });
});
