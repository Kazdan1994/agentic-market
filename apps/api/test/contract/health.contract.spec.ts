import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestApp, type TestApp } from "../support/app";
import { expectOperationDeclared, expectResponse } from "../support/openapi-contract";

describe("GET /health (contract)", () => {
  let testApp: TestApp;

  beforeAll(async () => {
    testApp = await createTestApp();
  });
  afterAll(async () => testApp.close());

  it("reports service, database and AI status without authentication", async () => {
    const res = await request(testApp.baseUrl).get("/health").expect(200);
    expectResponse("getHealth", 200, res.body);
    expect(res.body).toEqual({ status: "ok", db: "up", ai: "disabled" });
  });

  it("echoes the caller's correlation id", async () => {
    const id = "2c1b0a9f-8e7d-4c6b-9a5f-4e3d2c1b0a9f";
    const res = await request(testApp.baseUrl).get("/health").set("X-Correlation-Id", id);
    expect(res.headers["x-correlation-id"]).toBe(id);
  });

  it("is declared in the generated OpenAPI document", async () => {
    const res = await request(testApp.baseUrl).get("/openapi.json").expect(200);
    expectOperationDeclared(res.body, "getHealth");
  });

  it("returns a typed 404 for unknown routes", async () => {
    const res = await request(testApp.baseUrl).get("/v1/nope").expect(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });
});
