import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { candidate } from "../../../../test/support/candidates";
import { RuleBasedSelector } from "../../domain/rule-based-selector";
import { AI_SELECTION_JSON_SCHEMA } from "./ai-selection.schema";
import { OllamaProductSelector } from "./ollama-product-selector";
import type { OllamaConfig } from "./ollama-config";

const MODEL = "gemma4:e2b";
const KEPT = [candidate({ productId: "p1", priceMinor: 9_900 }), candidate({ productId: "p2", priceMinor: 7_900 })];

type Reply = { status?: number; delayMs?: number; content?: unknown; raw?: string };

describe("OllamaProductSelector", () => {
  let server: Server;
  let baseUrl: string;
  let reply: Reply = {};
  let seen: { url: string; body: Record<string, unknown> }[] = [];

  beforeAll(async () => {
    server = createServer((req, res) => {
      let raw = "";
      req.on("data", (chunk: Buffer) => (raw += chunk.toString()));
      req.on("end", () => {
        seen.push({ url: req.url ?? "", body: JSON.parse(raw) as Record<string, unknown> });
        setTimeout(() => {
          res.statusCode = reply.status ?? 200;
          res.setHeader("content-type", "application/json");
          const content = reply.raw ?? JSON.stringify(reply.content);
          res.end(JSON.stringify({ message: { role: "assistant", content } }));
        }, reply.delayMs ?? 0);
      });
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

  beforeEach(() => {
    seen = [];
    reply = {};
  });

  const config = (over: Partial<OllamaConfig> = {}): OllamaConfig => ({
    AGENT_SELECTION_MODE: "auto",
    OLLAMA_BASE_URL: baseUrl,
    AI_MODEL: MODEL,
    AI_TIMEOUT_MS: 100,
    ...over,
  });
  const selector = (over: Partial<OllamaConfig> = {}) => new OllamaProductSelector(config(over), new RuleBasedSelector());

  const answer = (over: Record<string, unknown> = {}) => ({
    chosenProductId: "p1",
    reason: "Best fit for running.",
    evaluations: [
      { productId: "p1", verdict: "kept", reason: "Made for running." },
      { productId: "p2", verdict: "discarded", reason: "Less suited." },
    ],
    ...over,
  });

  it("sends a non-streaming, deterministic chat request constrained by the schema", async () => {
    reply = { content: answer() };
    await selector().select("earbuds for running", KEPT);
    expect(seen).toHaveLength(1);
    expect(seen[0]?.url).toBe("/api/chat");
    expect(seen[0]?.body).toMatchObject({
      model: MODEL,
      stream: false,
      think: false,
      options: { temperature: 0 },
      keep_alive: "30m",
      format: AI_SELECTION_JSON_SCHEMA,
    });
  });

  it("returns the AI's choice with strategy ai", async () => {
    reply = { content: answer() };
    const result = await selector().select("earbuds for running", KEPT);
    expect(result).toEqual({
      selection: {
        productId: "p1",
        reason: "Best fit for running.",
        evaluations: [
          { productId: "p1", verdict: "kept", reason: "Made for running." },
          { productId: "p2", verdict: "discarded", reason: "Less suited." },
        ],
        strategy: "ai",
        fallbackReason: null,
      },
    });
  });

  it("gives candidates the AI left out the rule-based verdict, marked notEvaluatedByAi", async () => {
    // The rules would keep the cheaper p2, so its stand-in verdict is the rules' own.
    reply = { content: answer({ evaluations: [{ productId: "p1", verdict: "kept", reason: "Made for running." }] }) };
    const result = await selector().select("earbuds for running", KEPT);
    expect("selection" in result && result.selection.evaluations[1]).toMatchObject({ productId: "p2", verdict: "kept", notEvaluatedByAi: true });
  });

  it("drops evaluations of products that are not candidates", async () => {
    reply = { content: answer({ evaluations: [...answer().evaluations, { productId: "ghost", verdict: "kept", reason: "?" }] }) };
    const result = await selector().select("earbuds for running", KEPT);
    expect("selection" in result && result.selection.evaluations.map((e) => e.productId)).toEqual(["p1", "p2"]);
  });

  it("falls back with unavailable when the connection is refused", async () => {
    expect(await selector({ OLLAMA_BASE_URL: "http://127.0.0.1:1" }).select("earbuds", KEPT)).toEqual({ fallback: "unavailable" });
  });

  it("falls back with timeout when no answer arrives within AI_TIMEOUT_MS", async () => {
    reply = { content: answer(), delayMs: 300 };
    expect(await selector().select("earbuds", KEPT)).toEqual({ fallback: "timeout" });
  });

  it("falls back with api_error on an HTTP error", async () => {
    reply = { status: 404, content: answer() };
    expect(await selector().select("earbuds", KEPT)).toEqual({ fallback: "api_error" });
  });

  it.each([
    ["not JSON", { raw: "I think p1" }],
    ["off schema", { content: { choice: "p1" } }],
  ])("falls back with unusable_answer when the output is %s", async (_label, r) => {
    reply = r;
    expect(await selector().select("earbuds", KEPT)).toEqual({ fallback: "unusable_answer" });
  });

  it("falls back with ineligible_choice when the chosen id is not a candidate", async () => {
    reply = { content: answer({ chosenProductId: "ghost" }) };
    expect(await selector().select("earbuds", KEPT)).toEqual({ fallback: "ineligible_choice" });
  });
});
