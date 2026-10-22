import { describe, expect, it } from "vitest";
import { loadAppConfig } from "./app-config";

const valid = {
  DATABASE_URL: "postgres://u:p@localhost:5432/db",
  JWT_SECRET: "j".repeat(32),
  BUILTIN_KEY_SECRET: "b".repeat(32),
  SEED_DEMO_PASSWORD: "demo",
};

describe("loadAppConfig", () => {
  it("applies defaults for optional values", () => {
    const config = loadAppConfig(valid);
    expect(config.API_PORT).toBe(3000);
    expect(config.AGENT_SELECTION_MODE).toBe("auto");
    expect(config.AI_TIMEOUT_MS).toBe(10_000);
    expect(config.SIMULATED_DECLINE_CENTS).toBe(13);
    expect(config.OLLAMA_BASE_URL).toBeUndefined();
  });

  it.each(["DATABASE_URL", "JWT_SECRET", "BUILTIN_KEY_SECRET", "SEED_DEMO_PASSWORD"])(
    "fails fast when %s is missing",
    (key) => {
      const env = Object.fromEntries(Object.entries(valid).filter(([name]) => name !== key));
      expect(() => loadAppConfig(env)).toThrow(key);
    },
  );

  it("rejects short secrets and bad values", () => {
    expect(() => loadAppConfig({ ...valid, JWT_SECRET: "short" })).toThrow("JWT_SECRET");
    expect(() => loadAppConfig({ ...valid, AGENT_SELECTION_MODE: "magic" })).toThrow(
      "AGENT_SELECTION_MODE",
    );
    expect(() => loadAppConfig({ ...valid, SIMULATED_DECLINE_CENTS: "100" })).toThrow(
      "SIMULATED_DECLINE_CENTS",
    );
  });

  it("treats an empty OLLAMA_BASE_URL as not configured", () => {
    expect(loadAppConfig({ ...valid, OLLAMA_BASE_URL: "" }).OLLAMA_BASE_URL).toBeUndefined();
  });
});
