import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { seedCatalog } from "../../src/database/seed/seed-catalog";
import { seedUsers } from "../../src/database/seed/seed-users";
import { Argon2PasswordHasher } from "../../src/identity/infrastructure/argon2-password-hasher";
import { createTestApp, type TestApp } from "../support/app";
import { expectResponse } from "../support/openapi-contract";
import { getTestDataSource, truncateAll } from "../support/postgres";
import { DEMO_PASSWORD, loginAs } from "../support/session";

const tomorrow = () => new Date(Date.now() + 24 * 3_600_000).toISOString();
const validBody = () => ({
  name: "Runner",
  perPurchaseCapMinor: 10_000,
  totalBudgetMinor: 15_000,
  categorySlugs: ["audio"],
  expiresAt: tomorrow(),
});

describe("agents (contract)", () => {
  let testApp: TestApp;
  let alice: string;
  let bob: string;

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

  it("creates an agent with an active mandate and full remaining budget", async () => {
    const res = await request(testApp.baseUrl).post("/v1/agents").set("Cookie", alice).send(validBody()).expect(201);
    expectResponse("createAgent", 201, res.body);
    expect(res.body.mandate.status).toBe("active");
    expect(res.body.mandate.remaining).toEqual({ amountMinor: 15_000, currency: "EUR" });
    expect(res.body.mandate.categories).toEqual([{ slug: "audio", name: "Audio" }]);
  });

  it.each([
    [{ name: "" }, "name"],
    [{ perPurchaseCapMinor: 0 }, "perPurchaseCapMinor"],
    [{ categorySlugs: [] }, "categorySlugs"],
    [{ categorySlugs: ["audio", "audio"] }, "categorySlugs"],
    [{ expiresAt: "tomorrow" }, "expiresAt"],
    [{ expiresAt: "2030-01-01" }, "expiresAt"],
    [{ totalBudgetMinor: 3_000_000_000 }, "totalBudgetMinor"],
    [{ perPurchaseCapMinor: 20_000 }, "field"],
    [{ categorySlugs: ["toys"] }, "categorySlugs"],
  ])("rejects %o with 400 VALIDATION_FAILED naming the field", async (override, detailKey) => {
    const res = await request(testApp.baseUrl)
      .post("/v1/agents")
      .set("Cookie", alice)
      .send({ ...validBody(), ...override })
      .expect(400);
    expectResponse("createAgent", 400, res.body);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
    expect(Object.keys(res.body.error.details)).toContain(detailKey);
  });

  it("lists only the caller's agents and hides other users' agents", async () => {
    const bobs = await request(testApp.baseUrl).post("/v1/agents").set("Cookie", bob).send(validBody()).expect(201);

    const list = await request(testApp.baseUrl).get("/v1/agents").set("Cookie", alice).expect(200);
    expectResponse("listAgents", 200, list.body);
    expect(list.body.length).toBeGreaterThan(0);
    expect(list.body.map((a: { id: string }) => a.id)).not.toContain(bobs.body.id);

    const own = await request(testApp.baseUrl).get(`/v1/agents/${bobs.body.id}`).set("Cookie", bob).expect(200);
    expectResponse("getAgent", 200, own.body);
    const other = await request(testApp.baseUrl).get(`/v1/agents/${bobs.body.id}`).set("Cookie", alice).expect(404);
    expectResponse("getAgent", 404, other.body);
  });

  it("requires a session", async () => {
    await request(testApp.baseUrl).get("/v1/agents").expect(401);
    await request(testApp.baseUrl).post("/v1/agents").send(validBody()).expect(401);
  });
});
