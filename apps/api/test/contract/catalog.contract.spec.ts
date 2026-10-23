import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { seedCatalog } from "../../src/database/seed/seed-catalog";
import { seedUsers } from "../../src/database/seed/seed-users";
import { Argon2PasswordHasher } from "../../src/identity/infrastructure/argon2-password-hasher";
import { MandateKeySecrets } from "../../src/mandates/domain/mandate-key";
import { createTestApp, type TestApp } from "../support/app";
import { expectResponse } from "../support/openapi-contract";
import { getTestDataSource, truncateAll } from "../support/postgres";
import { DEMO_PASSWORD, loginAs } from "../support/session";

describe("catalog for agents (contract)", () => {
  let testApp: TestApp;
  let cookie: string;
  let key: string;
  let mandateId: string;

  const actions = async () => {
    const ds = await getTestDataSource();
    const rows: { action: string; result: string }[] = await ds.query(
      "SELECT action, result FROM mandate_activity WHERE mandate_id = $1 ORDER BY at",
      [mandateId],
    );
    return rows;
  };

  beforeAll(async () => {
    await truncateAll();
    const ds = await getTestDataSource();
    await seedUsers(ds, new Argon2PasswordHasher(), DEMO_PASSWORD);
    await seedCatalog(ds);
    testApp = await createTestApp();
    cookie = await loginAs(testApp.baseUrl, "alice@demo.local");
    const res = await request(testApp.baseUrl)
      .post("/v1/agents")
      .set("Cookie", cookie)
      .send({
        name: "Runner",
        perPurchaseCapMinor: 10_000,
        totalBudgetMinor: 15_000,
        categorySlugs: ["audio"],
        expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
      })
      .expect(201);
    mandateId = res.body.mandate.id;
    key = MandateKeySecrets.deriveBuiltin(process.env.BUILTIN_KEY_SECRET ?? "", mandateId).secret;
  });
  afterAll(async () => testApp.close());

  it("searches with a key and shows merchant and an eligibility hint", async () => {
    const res = await request(testApp.baseUrl)
      .get("/v1/catalog/search")
      .query({ q: "headphones" })
      .set("Authorization", `Bearer ${key}`)
      .expect(200);
    expectResponse("searchCatalog", 200, res.body);
    expect(res.body.length).toBeGreaterThan(0);
    const studio = res.body.find((p: { itemRef: string }) => p.itemRef === "audio-studio-max");
    expect(studio.merchant.name).toBeTruthy();
    expect(studio.eligibility).toEqual({ eligible: false, reasonCode: "over_budget" });
  });

  it("returns a product's current price and stock, or 404", async () => {
    const search = await request(testApp.baseUrl)
      .get("/v1/catalog/search")
      .query({ q: "earbuds", limit: 1 })
      .set("Authorization", `Bearer ${key}`);
    const id = search.body[0].id;
    const res = await request(testApp.baseUrl)
      .get(`/v1/catalog/products/${id}`)
      .set("Authorization", `Bearer ${key}`)
      .expect(200);
    expectResponse("getProduct", 200, res.body);
    expect(res.body.price.currency).toBe("EUR");

    const missing = await request(testApp.baseUrl)
      .get("/v1/catalog/products/00000000-0000-7000-8000-000000000999")
      .set("Authorization", `Bearer ${key}`)
      .expect(404);
    expectResponse("getProduct", 404, missing.body);
  });

  it.each([{ q: "lamp", limit: 0 }, { q: "lamp", limit: 51 }, { limit: 5 }, { q: "lamp", category: "" }])(
    "rejects invalid search parameters %o with 400",
    async (query) => {
      const res = await request(testApp.baseUrl)
        .get("/v1/catalog/search")
        .query(query)
        .set("Authorization", `Bearer ${key}`)
        .expect(400);
      expect(res.body.error.code).toBe("VALIDATION_FAILED");
    },
  );

  it("refuses a session cookie alone", async () => {
    await request(testApp.baseUrl).get("/v1/catalog/search").query({ q: "lamp" }).set("Cookie", cookie).expect(401);
  });

  it("records search and view_product activity", async () => {
    const recorded = await actions();
    expect(recorded.filter((r) => r.action === "search").length).toBeGreaterThanOrEqual(2);
    expect(recorded.filter((r) => r.action === "view_product").map((r) => r.result)).toEqual(["ok", "error"]);
  });

  it("lists categories with a key as well as with a session", async () => {
    const withKey = await request(testApp.baseUrl).get("/v1/categories").set("Authorization", `Bearer ${key}`).expect(200);
    expectResponse("listCategories", 200, withKey.body);
    await request(testApp.baseUrl).get("/v1/categories").set("Cookie", cookie).expect(200);
    await request(testApp.baseUrl).get("/v1/categories").expect(401);
  });
});
