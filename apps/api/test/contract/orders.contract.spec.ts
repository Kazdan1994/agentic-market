import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { seedCatalog } from "../../src/database/seed/seed-catalog";
import { seedUsers } from "../../src/database/seed/seed-users";
import { Argon2PasswordHasher } from "../../src/identity/infrastructure/argon2-password-hasher";
import { createAgent, productId } from "../support/agents";
import { createTestApp, type TestApp } from "../support/app";
import { expectResponse } from "../support/openapi-contract";
import { getTestDataSource, truncateAll } from "../support/postgres";
import { DEMO_PASSWORD, loginAs } from "../support/session";

describe("orders (contract)", () => {
  let testApp: TestApp;
  let alice: string;
  let bob: string;
  const orderIds: string[] = [];
  const runId = randomUUID();

  async function buy(key: string, itemRef: string, merchant: string, headers: Record<string, string> = {}) {
    const p = await productId(itemRef, merchant);
    const req = request(testApp.baseUrl)
      .post("/v1/checkout")
      .set("Authorization", `Bearer ${key}`)
      .set("Idempotency-Key", randomUUID());
    for (const [name, value] of Object.entries(headers)) req.set(name, value);
    const res = await req.send({ productId: p.id, expectedPriceMinor: p.priceMinor }).expect(201);
    return res.body.id as string;
  }

  beforeAll(async () => {
    await truncateAll();
    const ds = await getTestDataSource();
    await seedUsers(ds, new Argon2PasswordHasher(), DEMO_PASSWORD);
    await seedCatalog(ds);
    testApp = await createTestApp();
    alice = await loginAs(testApp.baseUrl, "alice@demo.local");
    bob = await loginAs(testApp.baseUrl, "bob@demo.local");
    const { builtinKey } = await createAgent(testApp.baseUrl, alice);
    orderIds.push(await buy(builtinKey, "audio-bassbox-mini", "soundhub"));
    orderIds.push(await buy(builtinKey, "audio-wired-classic", "soundhub", { "X-Agent-Run-Id": runId }));
  });
  afterAll(async () => testApp.close());

  it("lists the caller's orders, newest first", async () => {
    const res = await request(testApp.baseUrl).get("/v1/orders").set("Cookie", alice).expect(200);
    expectResponse("listOrders", 200, res.body);
    expect(res.body.map((o: { id: string }) => o.id)).toEqual([...orderIds].reverse());
    const empty = await request(testApp.baseUrl).get("/v1/orders").set("Cookie", bob).expect(200);
    expect(empty.body).toEqual([]);
  });

  it("returns one order with its run id, and 404 for another user's order", async () => {
    const res = await request(testApp.baseUrl).get(`/v1/orders/${orderIds[1]}`).set("Cookie", alice).expect(200);
    expectResponse("getOrder", 200, res.body);
    expect(res.body.runId).toBe(runId);
    const other = await request(testApp.baseUrl).get(`/v1/orders/${orderIds[1]}`).set("Cookie", bob).expect(404);
    expectResponse("getOrder", 404, other.body);
  });

  it("requires a session", async () => {
    await request(testApp.baseUrl).get("/v1/orders").expect(401);
  });
});
