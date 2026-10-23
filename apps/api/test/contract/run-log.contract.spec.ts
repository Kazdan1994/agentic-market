import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { seedCatalog } from "../../src/database/seed/seed-catalog";
import { seedUsers } from "../../src/database/seed/seed-users";
import { Argon2PasswordHasher } from "../../src/identity/infrastructure/argon2-password-hasher";
import { createAgent } from "../support/agents";
import { createTestApp, type TestApp } from "../support/app";
import { expectResponse } from "../support/openapi-contract";
import { getTestDataSource, truncateAll } from "../support/postgres";
import { DEMO_PASSWORD, loginAs } from "../support/session";

describe("run decision log (contract)", () => {
  let testApp: TestApp;
  let alice: string;
  let bob: string;

  async function runToCompletion(mandateId: string, text: string): Promise<string> {
    const started = await request(testApp.baseUrl)
      .post(`/v1/mandates/${mandateId}/runs`)
      .set("Cookie", alice)
      .send({ request: text })
      .expect(202);
    const deadline = Date.now() + 30_000;
    for (;;) {
      const res = await request(testApp.baseUrl).get(`/v1/runs/${started.body.id}`).set("Cookie", alice).expect(200);
      if (res.body.status === "completed") return res.body.id as string;
      if (Date.now() > deadline) throw new Error("run still running after 30 s");
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  const getLog = (runId: string, cookie = alice) =>
    request(testApp.baseUrl).get(`/v1/runs/${runId}/log`).set("Cookie", cookie);

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

  it("returns the full log in seq order with evaluation details", async () => {
    const { mandateId } = await createAgent(testApp.baseUrl, alice);
    const runId = await runToCompletion(mandateId, "wireless running earbuds");

    const res = await getLog(runId).expect(200);
    expectResponse("getRunLog", 200, res.body);
    const seqs = res.body.map((entry: { seq: number }) => entry.seq);
    expect(seqs).toEqual(seqs.map((_: number, index: number) => index + 1));
    expect(res.body[0].step).toBe("search");
    expect(res.body.at(-1).step).toBe("outcome");

    const evaluation = res.body.find((entry: { step: string }) => entry.step === "evaluation");
    expect(evaluation.message).toEqual(expect.any(String));
    expect(evaluation.data).toMatchObject({
      verdict: expect.stringMatching(/^(kept|discarded)$/),
      merchant: expect.anything(),
      priceMinor: expect.any(Number),
    });
    expect(evaluation.data).toHaveProperty("reasonCode");
  });

  it("keeps a full log ending in outcome for a run without an order", async () => {
    const { mandateId } = await createAgent(testApp.baseUrl, alice, { perPurchaseCapMinor: 100 });
    const runId = await runToCompletion(mandateId, "wireless running earbuds");

    const res = await getLog(runId).expect(200);
    expect(res.body.length).toBeGreaterThan(1);
    expect(res.body.at(-1)).toMatchObject({ step: "outcome" });
    expect(res.body.some((entry: { step: string }) => entry.step === "payment")).toBe(false);
  });

  it("hides another user's run log as 404", async () => {
    const { mandateId } = await createAgent(testApp.baseUrl, alice);
    const runId = await runToCompletion(mandateId, "wireless running earbuds");
    const res = await getLog(runId, bob).expect(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });
});
