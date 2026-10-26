import { createServer } from "node:net";
import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { inject } from "vitest";
import { AppModule } from "../../src/app.module";
import { configureApp } from "../../src/configure-app";

export interface TestApp {
  app: INestApplication;
  baseUrl: string;
  close(): Promise<void>;
}

async function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() =>
        typeof address === "object" && address ? resolve(address.port) : reject(new Error("no port")),
      );
    });
  });
}

/**
 * Boots the real API against the test database on a real port, so the built-in agent's
 * loopback calls (research R8) reach this same app. AI is off: rules only.
 */
export async function createTestApp(overrides: Record<string, string> = {}): Promise<TestApp> {
  const port = await freePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  Object.assign(process.env, {
    DATABASE_URL: inject("databaseUrl"),
    API_PORT: String(port),
    API_INTERNAL_BASE_URL: baseUrl,
    JWT_SECRET: "test-jwt-secret-".padEnd(48, "x"),
    BUILTIN_KEY_SECRET: "test-builtin-key-secret-".padEnd(48, "y"),
    SEED_DEMO_PASSWORD: "demo-password",
    AGENT_SELECTION_MODE: "rules",
    OLLAMA_BASE_URL: "",
    LOG_LEVEL: "silent",
    ...overrides,
  });
  // Configuration is read when Nest instantiates providers (during compile), after the env is set.
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication({ bufferLogs: true });
  await configureApp(app);
  await app.listen(port, "127.0.0.1");
  return { app, baseUrl, close: () => app.close() };
}
