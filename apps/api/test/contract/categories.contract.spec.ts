import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { seedCatalog } from "../../src/database/seed/seed-catalog";
import { seedUsers } from "../../src/database/seed/seed-users";
import { Argon2PasswordHasher } from "../../src/identity/infrastructure/argon2-password-hasher";
import { createTestApp, type TestApp } from "../support/app";
import { expectResponse } from "../support/openapi-contract";
import { getTestDataSource, truncateAll } from "../support/postgres";

describe("GET /v1/categories (contract)", () => {
  let testApp: TestApp;
  let cookie: string;

  beforeAll(async () => {
    await truncateAll();
    const ds = await getTestDataSource();
    await seedUsers(ds, new Argon2PasswordHasher(), "demo-password");
    await seedCatalog(ds);
    testApp = await createTestApp();
    const login = await request(testApp.baseUrl)
      .post("/v1/auth/login")
      .send({ email: "alice@demo.local", password: "demo-password" });
    const setCookie = login.headers["set-cookie"] as unknown as string[];
    cookie = setCookie[0]?.split(";")[0] ?? "";
  });
  afterAll(async () => testApp.close());

  it("lists every category for a signed-in user", async () => {
    const res = await request(testApp.baseUrl).get("/v1/categories").set("Cookie", cookie).expect(200);
    expectResponse("listCategories", 200, res.body);
    expect(res.body.map((c: { slug: string }) => c.slug)).toEqual([
      "audio",
      "books",
      "home",
      "kitchen",
      "sports",
    ]);
  });

  it("returns 401 without credentials", async () => {
    const res = await request(testApp.baseUrl).get("/v1/categories").expect(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });
});
