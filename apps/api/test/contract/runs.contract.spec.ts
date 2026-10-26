import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { seedCatalog } from "../../src/database/seed/seed-catalog";
import { seedUsers } from "../../src/database/seed/seed-users";
import { Argon2PasswordHasher } from "../../src/identity/infrastructure/argon2-password-hasher";
import { createAgent, insertRunningRun } from "../support/agents";
import { createTestApp, type TestApp } from "../support/app";
import { expectResponse } from "../support/openapi-contract";
import { getTestDataSource, truncateAll } from "../support/postgres";
import { DEMO_PASSWORD, loginAs } from "../support/session";

describe("agent runs (contract)", () => {
  let testApp: TestApp;
  let alice: string;
  let bob: string;

  const start = (mandateId: string, body: object, cookie = alice) =>
    request(testApp.baseUrl).post(`/v1/mandates/${mandateId}/runs`).set("Cookie", cookie).send(body);

  async function waitForCompletion(runId: string) {
    const deadline = Date.now() + 30_000;
    for (;;) {
      const res = await request(testApp.baseUrl).get(`/v1/runs/${runId}`).set("Cookie", alice).expect(200);
      if (res.body.status === "completed") return res.body;
      if (Date.now() > deadline) throw new Error(`run ${runId} still running after 30 s`);
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  beforeAll(async () => {
    await truncateAll();
    const ds = await getTestDataSource();
    await seedUsers(ds, new Argon2PasswordHasher(), DEMO_PASSWORD);
    await seedCatalog(ds);
    testApp = await createTestApp();
    alice = await loginAs(testApp.baseUrl, "alice@demo.local");
    bob = await loginAs(testApp.baseUrl, "bob@demo.local");
  });
  afterAll(async () => testApp.close());

  it("starts a run with 202 and completes it with an order within 30 s", async () => {
    const { mandateId } = await createAgent(testApp.baseUrl, alice);
    const started = Date.now();
    const res = await start(mandateId, { request: "wireless running earbuds" }).expect(202);
    expectResponse("startRun", 202, res.body);
    expect(res.body.status).toBe("running");

    const run = await waitForCompletion(res.body.id);
    expectResponse("getRun", 200, run);
    expect(run).toMatchObject({ outcome: "order_placed", strategy: "rules" });
    expect(run.orderId).toBeTruthy();
    expect(Date.now() - started).toBeLessThan(30_000);

    const order = await request(testApp.baseUrl).get(`/v1/orders/${run.orderId}`).set("Cookie", alice).expect(200);
    expect(order.body).toMatchObject({ runId: run.id, placedBy: "builtin_agent", merchant: { slug: "techcorner" } });
  });

  it("refuses a second run while one is running", async () => {
    const { mandateId } = await createAgent(testApp.baseUrl, alice);
    await insertRunningRun(mandateId);
    const res = await start(mandateId, { request: "wireless earbuds" }).expect(409);
    expectResponse("startRun", 409, res.body);
    expect(res.body.error.code).toBe("RUN_ALREADY_IN_PROGRESS");
  });

  it("refuses an exhausted mandate", async () => {
    const { mandateId } = await createAgent(testApp.baseUrl, alice);
    const ds = await getTestDataSource();
    await ds.query("UPDATE mandates SET spent_minor = total_budget_minor WHERE id = $1", [mandateId]);
    const res = await start(mandateId, { request: "wireless earbuds" }).expect(409);
    expect(res.body.error).toMatchObject({ code: "MANDATE_EXHAUSTED", message: "Budget used up." });
  });

  it("refuses an invalid request with 422", async () => {
    const { mandateId } = await createAgent(testApp.baseUrl, alice);
    const res = await start(mandateId, { request: "the a" }).expect(422);
    expectResponse("startRun", 422, res.body);
    expect(res.body.error.code).toBe("INVALID_REQUEST");
  });

  it("lists a mandate's runs newest first and hides them from other users", async () => {
    const { mandateId } = await createAgent(testApp.baseUrl, alice);
    const first = (await start(mandateId, { request: "wireless running earbuds" }).expect(202)).body.id;
    await waitForCompletion(first);
    const second = (await start(mandateId, { request: "portable speaker" }).expect(202)).body.id;
    await waitForCompletion(second);

    const list = await request(testApp.baseUrl).get(`/v1/mandates/${mandateId}/runs`).set("Cookie", alice).expect(200);
    expectResponse("listRuns", 200, list.body);
    expect(list.body.map((r: { id: string }) => r.id)).toEqual([second, first]);

    await request(testApp.baseUrl).get(`/v1/runs/${first}`).set("Cookie", bob).expect(404);
    await request(testApp.baseUrl).get(`/v1/mandates/${mandateId}/runs`).set("Cookie", bob).expect(404);
    await start(mandateId, { request: "wireless earbuds" }, bob).expect(404);
  });
});
