import { describe, expect, it } from "vitest";
import { candidate } from "../../../../test/support/candidates";
import { AI_SELECTION_JSON_SCHEMA, AiSelectionAnswer } from "./ai-selection.schema";
import { selectionPrompt } from "./prompt";

describe("AI selection schema", () => {
  it("converts to a JSON schema for Ollama's format field", () => {
    expect(AI_SELECTION_JSON_SCHEMA).toMatchObject({
      type: "object",
      required: expect.arrayContaining(["chosenProductId", "reason", "evaluations"]),
    });
  });

  it("accepts a valid answer and a null choice", () => {
    const answer = { chosenProductId: null, reason: "None fit.", evaluations: [{ productId: "p1", verdict: "discarded", reason: "Wrong use." }] };
    expect(AiSelectionAnswer.safeParse(answer).success).toBe(true);
  });

  it("rejects an unknown verdict", () => {
    const answer = { chosenProductId: "p1", reason: "Fits.", evaluations: [{ productId: "p1", verdict: "maybe", reason: "?" }] };
    expect(AiSelectionAnswer.safeParse(answer).success).toBe(false);
  });
});

describe("selection prompt", () => {
  const kept = [
    candidate({ productId: "p1", name: "RunBuds Pro", merchantName: "SoundHub", description: "Running earbuds", categoryName: "Audio", priceMinor: 8_900, itemRef: "secret-item-ref" }),
  ];
  const prompt = selectionPrompt("wireless headphones for running", kept);

  it("contains the request and each candidate's id, merchant, name, description, category and price", () => {
    expect(prompt).toContain("wireless headphones for running");
    for (const part of ["p1", "SoundHub", "RunBuds Pro", "Running earbuds", "Audio", "89.00"]) expect(prompt).toContain(part);
  });

  it("leaves out stock, item refs, keys and user data", () => {
    expect(prompt).not.toMatch(/secret-item-ref|stock|api[_ ]?key|email|mandate/i);
  });

  it("asks for reasons of at most 15 words", () => {
    expect(prompt).toMatch(/15 words/);
  });
});
