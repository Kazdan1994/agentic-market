import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { seedCatalog } from "../../src/database/seed/seed-catalog";
import { seedUsers } from "../../src/database/seed/seed-users";
import { Argon2PasswordHasher } from "../../src/identity/infrastructure/argon2-password-hasher";
import { createAgent, insertExternalKey, insertRunningRun, productId } from "../support/agents";
import { createTestApp, type TestApp } from "../support/app";
import { expectResponse } from "../support/openapi-contract";
import { getTestDataSource, truncateAll } from "../support/postgres";
import { DEMO_PASSWORD, loginAs } from "../support/session";

describe("POST /v1/checkout (contract)", () => {
  let testApp: TestApp;
  let cookie: string;

  const post = (key: string, body: object, headers: Record<string, string> = { "Idempotency-Key": randomUUID() }) => {
    const req = request(testApp.baseUrl).post("/v1/checkout").set("Authorization", `Bearer ${key}`);
    for (const [name, value] of Object.entries(headers)) req.set(name, value);
    return req.send(body);
  };

  beforeAll(async () => {
    await truncateAll();
    const ds = await getTestDataSource();
    await seedUsers(ds, new Argon2PasswordHasher(), DEMO_PASSWORD);
    await seedCatalog(ds);
    testApp = await createTestApp();
    cookie = await loginAs(testApp.baseUrl, "alice@demo.local");
  });
  afterAll(async () => testApp.close());

  it("places an order with the built-in key and stores the run id", async () => {
    const { builtinKey, mandateId } = await createAgent(testApp.baseUrl, cookie);
    const p = await productId("audio-runbuds-pro", "techcorner");
    const runId = await insertRunningRun(mandateId);
    const res = await post(builtinKey, { productId: p.id, expectedPriceMinor: p.priceMinor }, {
      "Idempotency-Key": "run-step-0001",
      "X-Agent-Run-Id": runId,
    }).expect(201);
    expectResponse("checkout", 201, res.body);
    expect(res.body).toMatchObject({ placedBy: "builtin_agent", runId, quantity: 1, status: "paid_simulated" });
    expect(res.body.merchant.slug).toBe("techcorner");

    const replay = await post(builtinKey, { productId: p.id, expectedPriceMinor: p.priceMinor }, {
      "Idempotency-Key": "run-step-0001",
      "X-Agent-Run-Id": runId,
    }).expect(201);
    expect(replay.body.id).toBe(res.body.id);
  });

  it("refuses a built-in checkout naming a run that is not running on this mandate", async () => {
    const { builtinKey } = await createAgent(testApp.baseUrl, cookie);
    const p = await productId("audio-runbuds-pro", "techcorner");
    const res = await post(builtinKey, { productId: p.id, expectedPriceMinor: p.priceMinor }, {
      "Idempotency-Key": randomUUID(),
      "X-Agent-Run-Id": randomUUID(),
    }).expect(400);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });

  it("ignores X-Agent-Run-Id for external keys", async () => {
    const { mandateId } = await createAgent(testApp.baseUrl, cookie);
    const key = await insertExternalKey(mandateId);
    const p = await productId("audio-bassbox-mini", "soundhub");
    const res = await post(key, { productId: p.id, expectedPriceMinor: p.priceMinor }, {
      "Idempotency-Key": randomUUID(),
      "X-Agent-Run-Id": randomUUID(),
    }).expect(201);
    expect(res.body).toMatchObject({ placedBy: "third_party_agent", runId: null });
  });

  it.each([undefined, "short", "x".repeat(101)])("requires an Idempotency-Key of 8-100 chars (got %j)", async (header) => {
    const { builtinKey } = await createAgent(testApp.baseUrl, cookie);
    const p = await productId("audio-runbuds-pro", "techcorner");
    const res = await post(builtinKey, { productId: p.id, expectedPriceMinor: p.priceMinor }, header ? { "Idempotency-Key": header } : {}).expect(400);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });

  it("returns 402 for a declined payment", async () => {
    const { builtinKey } = await createAgent(testApp.baseUrl, cookie);
    const p = await productId("audio-clip-earbuds", "soundhub");
    const res = await post(builtinKey, { productId: p.id, expectedPriceMinor: p.priceMinor }).expect(402);
    expectResponse("checkout", 402, res.body);
    expect(res.body.error.code).toBe("PAYMENT_DECLINED");
  });

  it.each([
    ["kitchen-chef-knife", "homegoods", 0, "CATEGORY_NOT_ALLOWED"],
    ["audio-neckband-sport", "soundhub", 0, "OUT_OF_STOCK"],
    ["audio-runbuds-pro", "soundhub", -1, "PRICE_CHANGED"],
    ["audio-studio-max", "techcorner", 0, "OVER_PER_PURCHASE_CAP"],
  ])("refuses %s with 409 %s", async (itemRef, merchant, priceDelta, code) => {
    const { builtinKey } = await createAgent(testApp.baseUrl, cookie);
    const p = await productId(itemRef, merchant);
    const res = await post(builtinKey, { productId: p.id, expectedPriceMinor: p.priceMinor + priceDelta }).expect(409);
    expectResponse("checkout", 409, res.body);
    expect(res.body.error.code).toBe(code);
  });

  it("records checkout activity with the outcome", async () => {
    const { builtinKey, mandateId } = await createAgent(testApp.baseUrl, cookie);
    const declined = await productId("audio-clip-earbuds", "soundhub");
    await post(builtinKey, { productId: declined.id, expectedPriceMinor: declined.priceMinor }).expect(402);
    const ds = await getTestDataSource();
    const rows: { action: string; result: string }[] = await ds.query(
      "SELECT action, result FROM mandate_activity WHERE mandate_id = $1",
      [mandateId],
    );
    expect(rows).toEqual([{ action: "checkout", result: "declined" }]);
  });
});
