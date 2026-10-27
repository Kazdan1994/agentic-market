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

const DAY_MS = 86_400_000;
const inDays = (days: number) => new Date(Date.now() + days * DAY_MS).toISOString();

describe("agents summary (contract)", () => {
  let testApp: TestApp;
  let alice: string;
  let bob: string;
  let runId: string;
  let runningMandateId: string;

  beforeAll(async () => {
    await truncateAll();
    const ds = await getTestDataSource();
    await seedUsers(ds, new Argon2PasswordHasher(), DEMO_PASSWORD);
    await seedCatalog(ds);
    testApp = await createTestApp();
    alice = await loginAs(testApp.baseUrl, "alice@demo.local");
    bob = await loginAs(testApp.baseUrl, "bob@demo.local");

    const soon = await createAgent(testApp.baseUrl, alice, { name: "Soon", totalBudgetMinor: 10_000, expiresAt: inDays(2.5) });
    await createAgent(testApp.baseUrl, alice, { name: "Later", perPurchaseCapMinor: 5_000, totalBudgetMinor: 5_000, expiresAt: inDays(30) });
    const revoked = await createAgent(testApp.baseUrl, alice, { name: "Revoked", expiresAt: inDays(1) });
    const exhausted = await createAgent(testApp.baseUrl, alice, { name: "Exhausted", expiresAt: inDays(1) });
    await ds.query(`UPDATE mandates SET revoked_at = now() WHERE id = $1`, [revoked.mandateId]);
    await ds.query(`UPDATE mandates SET spent_minor = total_budget_minor WHERE id = $1`, [exhausted.mandateId]);
    runningMandateId = soon.mandateId;
    runId = await insertRunningRun(soon.mandateId);
  });
  afterAll(async () => testApp.close());

  it("adds up the active mandates only", async () => {
    const res = await request(testApp.baseUrl).get("/v1/agents/summary").set("Cookie", alice).expect(200);
    expectResponse("getAgentsSummary", 200, res.body);
    expect(res.body.remaining).toEqual({ amountMinor: 15_000, currency: "EUR" });
    expect(res.body.activeCount).toBe(2);
  });

  it("names the soonest active mandate ending within a week, in whole days rounded up", async () => {
    const res = await request(testApp.baseUrl).get("/v1/agents/summary").set("Cookie", alice).expect(200);
    expect(res.body.endingSoon).toMatchObject({ agentName: "Soon", days: 3 });
  });

  it("lists the running runs of active mandates", async () => {
    const res = await request(testApp.baseUrl).get("/v1/agents/summary").set("Cookie", alice).expect(200);
    expect(res.body.running).toEqual([{ mandateId: runningMandateId, runId, agentName: "Soon" }]);
  });

  it("returns an empty summary for a user with no agent", async () => {
    const res = await request(testApp.baseUrl).get("/v1/agents/summary").set("Cookie", bob).expect(200);
    expectResponse("getAgentsSummary", 200, res.body);
    expect(res.body).toEqual({ remaining: { amountMinor: 0, currency: "EUR" }, activeCount: 0, endingSoon: null, running: [] });
  });

  it("requires a session", async () => {
    await request(testApp.baseUrl).get("/v1/agents/summary").expect(401);
  });
});
