import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { seedCatalog } from "../../src/database/seed/seed-catalog";
import { seedUsers } from "../../src/database/seed/seed-users";
import { Argon2PasswordHasher } from "../../src/identity/infrastructure/argon2-password-hasher";
import { MandateKeySecrets } from "../../src/mandates/domain/mandate-key";
import { createTestApp, type TestApp } from "../support/app";
import { expectResponse, expectSchema } from "../support/openapi-contract";
import { getTestDataSource, truncateAll } from "../support/postgres";
import { DEMO_PASSWORD, loginAs } from "../support/session";

describe("mandate key authentication (contract, GET /v1/mandate)", () => {
  let testApp: TestApp;
  let alice: string;

  async function newMandate(): Promise<{ mandateId: string; key: string }> {
    const res = await request(testApp.baseUrl)
      .post("/v1/agents")
      .set("Cookie", alice)
      .send({
        name: "Runner",
        perPurchaseCapMinor: 10_000,
        totalBudgetMinor: 15_000,
        categorySlugs: ["audio"],
        expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
      })
      .expect(201);
    const mandateId = res.body.mandate.id as string;
    const secret = process.env.BUILTIN_KEY_SECRET ?? "";
    return { mandateId, key: MandateKeySecrets.deriveBuiltin(secret, mandateId).secret };
  }

  async function activity(mandateId: string): Promise<{ action: string; result: string }[]> {
    const ds = await getTestDataSource();
    return ds.query("SELECT action, result FROM mandate_activity WHERE mandate_id = $1 ORDER BY at", [mandateId]);
  }

  beforeAll(async () => {
    await truncateAll();
    const ds = await getTestDataSource();
    await seedUsers(ds, new Argon2PasswordHasher(), DEMO_PASSWORD);
    await seedCatalog(ds);
    testApp = await createTestApp();
    alice = await loginAs(testApp.baseUrl, "alice@demo.local");
  });
  afterAll(async () => testApp.close());

  it("returns the key's mandate and records one view_mandate activity", async () => {
    const { mandateId, key } = await newMandate();
    const res = await request(testApp.baseUrl).get("/v1/mandate").set("Authorization", `Bearer ${key}`).expect(200);
    expectResponse("getOwnMandate", 200, res.body);
    expect(res.body.id).toBe(mandateId);
    expect(await activity(mandateId)).toEqual([{ action: "view_mandate", result: "ok" }]);
  });

  it("answers missing, unknown and revoked keys with the same 401", async () => {
    const { mandateId, key } = await newMandate();
    const ds = await getTestDataSource();
    await ds.query("UPDATE mandate_keys SET revoked_at = now() WHERE mandate_id = $1", [mandateId]);

    const bodies = [];
    for (const header of [undefined, "Bearer amk_unknownunknownunknownunknownunknownunknow", `Bearer ${key}`]) {
      const req = request(testApp.baseUrl).get("/v1/mandate");
      const res = await (header ? req.set("Authorization", header) : req).expect(401);
      expectResponse("getOwnMandate", 401, res.body);
      bodies.push(res.body);
    }
    expect(new Set(bodies.map((b) => JSON.stringify(b))).size).toBe(1);
    expect(await activity(mandateId)).toEqual([]);
  });

  it.each([
    ["revoked", "UPDATE mandates SET revoked_at = now() WHERE id = $1", "MANDATE_REVOKED"],
    ["expired", "UPDATE mandates SET expires_at = now() - interval '1 minute' WHERE id = $1", "MANDATE_EXPIRED"],
    ["exhausted", "UPDATE mandates SET spent_minor = total_budget_minor WHERE id = $1", "MANDATE_EXHAUSTED"],
  ])("refuses a key of a %s mandate with 409 %s and audits it", async (_status, sql, code) => {
    const { mandateId, key } = await newMandate();
    const ds = await getTestDataSource();
    await ds.query(sql, [mandateId]);

    const res = await request(testApp.baseUrl).get("/v1/mandate").set("Authorization", `Bearer ${key}`).expect(409);
    // The contract does not declare 409 on getOwnMandate yet (see loop-log.md); check the error shape.
    expectSchema("Error", res.body);
    expect(res.body.error.code).toBe(code);
    expect(await activity(mandateId)).toEqual([{ action: "view_mandate", result: "refused" }]);
    const audits: { payload: { code: string } }[] = await ds.query(
      "SELECT payload FROM audit_events WHERE mandate_id = $1 AND type = 'mandate.check.refused'",
      [mandateId],
    );
    expect(audits.map((a) => a.payload.code)).toEqual([code]);
  });
});
