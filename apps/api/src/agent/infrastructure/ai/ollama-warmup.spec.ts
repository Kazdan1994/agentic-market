import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { OllamaAiStatus } from "./ollama-ai-status.adapter";
import { OllamaWarmup, type OllamaConfig } from "./ollama-warmup";

interface Seen {
  method: string;
  url: string;
  body: unknown;
}

const MODEL = "gemma4:e2b";
const silent = { warn: () => undefined };

describe("Ollama warm-up and status", () => {
  let server: Server;
  let baseUrl: string;
  let seen: Seen[] = [];
  let loaded: string[] = [];
  let release: () => void = () => undefined;
  let held = false;

  beforeAll(async () => {
    server = createServer((req, res) => {
      let raw = "";
      req.on("data", (chunk: Buffer) => (raw += chunk.toString()));
      req.on("end", () => {
        seen.push({ method: req.method ?? "", url: req.url ?? "", body: raw ? JSON.parse(raw) : null });
        const reply = () => {
          res.setHeader("content-type", "application/json");
          res.end(req.url === "/api/ps" ? JSON.stringify({ models: loaded.map((name) => ({ name, model: name })) }) : "{}");
        };
        if (held && req.url === "/api/generate") release = reply;
        else reply();
      });
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

  beforeEach(() => {
    seen = [];
    loaded = [];
    held = false;
  });

  const config = (over: Partial<OllamaConfig> = {}): OllamaConfig => ({
    AGENT_SELECTION_MODE: "auto",
    OLLAMA_BASE_URL: baseUrl,
    AI_MODEL: MODEL,
    AI_TIMEOUT_MS: 1_000,
    ...over,
  });

  it("sends one background load request at boot without blocking startup", async () => {
    held = true;
    const warmup = new OllamaWarmup(config(), silent);
    warmup.onApplicationBootstrap();
    await expect.poll(() => seen.length).toBe(1);
    expect(seen[0]).toEqual({ method: "POST", url: "/api/generate", body: { model: MODEL, keep_alive: "30m" } });
    release();
  });

  it.each([
    ["not configured", { OLLAMA_BASE_URL: undefined }],
    ["forced to rules", { AGENT_SELECTION_MODE: "rules" as const }],
  ])("does not warm up when %s", async (_label, over) => {
    new OllamaWarmup(config(over), silent).onApplicationBootstrap();
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(seen).toEqual([]);
  });

  it("does not throw when Ollama is down", async () => {
    const warnings: unknown[] = [];
    new OllamaWarmup(config({ OLLAMA_BASE_URL: "http://127.0.0.1:1" }), { warn: (obj) => void warnings.push(obj) }).onApplicationBootstrap();
    await expect.poll(() => warnings.length).toBe(1);
  });

  it("reports warm when /api/ps lists the model", async () => {
    loaded = [MODEL];
    expect(await new OllamaAiStatus(config()).current()).toBe("warm");
  });

  it("reports cold when the model is not loaded", async () => {
    loaded = ["gemma3:12b"];
    expect(await new OllamaAiStatus(config()).current()).toBe("cold");
  });

  it("reports unavailable on a connection error", async () => {
    expect(await new OllamaAiStatus(config({ OLLAMA_BASE_URL: "http://127.0.0.1:1" })).current()).toBe("unavailable");
  });

  it.each([
    ["OLLAMA_BASE_URL", { OLLAMA_BASE_URL: undefined }],
    ["AI_MODEL", { AI_MODEL: undefined }],
    ["AGENT_SELECTION_MODE=rules", { AGENT_SELECTION_MODE: "rules" as const }],
  ])("reports disabled without %s", async (_label, over) => {
    expect(await new OllamaAiStatus(config(over)).current()).toBe("disabled");
    expect(seen).toEqual([]);
  });
});
