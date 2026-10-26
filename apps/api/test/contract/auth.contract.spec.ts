import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { seedUsers } from "../../src/database/seed/seed-users";
import { Argon2PasswordHasher } from "../../src/identity/infrastructure/argon2-password-hasher";
import { createTestApp, type TestApp } from "../support/app";
import { expectResponse } from "../support/openapi-contract";
import { getTestDataSource, truncateAll } from "../support/postgres";

const PASSWORD = "demo-password";

function sessionCookie(res: request.Response): string {
  const raw = res.headers["set-cookie"] as unknown as string[] | undefined;
  const cookie = raw?.find((c) => c.startsWith("am_session="));
  if (!cookie) throw new Error("am_session cookie not set");
  return cookie;
}

describe("auth (contract)", () => {
  let testApp: TestApp;

  beforeAll(async () => {
    await truncateAll();
    await seedUsers(await getTestDataSource(), new Argon2PasswordHasher(), PASSWORD);
    testApp = await createTestApp({ SEED_DEMO_PASSWORD: PASSWORD });
  });
  afterAll(async () => testApp.close());

  it("logs in with 204 and an httpOnly, SameSite=Lax, 8-hour session cookie", async () => {
    const res = await request(testApp.baseUrl)
      .post("/v1/auth/login")
      .send({ email: "alice@demo.local", password: PASSWORD })
      .expect(204);
    const cookie = sessionCookie(res);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
    expect(cookie).toMatch(/Max-Age=28800/);
  });

  it("returns 401 for bad credentials", async () => {
    const res = await request(testApp.baseUrl)
      .post("/v1/auth/login")
      .send({ email: "alice@demo.local", password: "nope" })
      .expect(401);
    expectResponse("login", 401, res.body);
  });

  it("returns the current user with a session and 401 without", async () => {
    const login = await request(testApp.baseUrl)
      .post("/v1/auth/login")
      .send({ email: "bob@demo.local", password: PASSWORD });
    const cookie = sessionCookie(login).split(";")[0] ?? "";
    const me = await request(testApp.baseUrl).get("/v1/me").set("Cookie", cookie).expect(200);
    expectResponse("getMe", 200, me.body);
    expect(me.body).toMatchObject({ email: "bob@demo.local", displayName: "Bob" });

    const anonymous = await request(testApp.baseUrl).get("/v1/me").expect(401);
    expectResponse("getMe", 401, anonymous.body);
    await request(testApp.baseUrl).get("/v1/me").set("Cookie", "am_session=forged").expect(401);
  });

  it("clears the cookie on logout", async () => {
    const login = await request(testApp.baseUrl)
      .post("/v1/auth/login")
      .send({ email: "alice@demo.local", password: PASSWORD });
    const cookie = sessionCookie(login).split(";")[0] ?? "";
    const res = await request(testApp.baseUrl)
      .post("/v1/auth/logout")
      .set("Cookie", cookie)
      .expect(204);
    expect(sessionCookie(res)).toMatch(/am_session=;|Expires=Thu, 01 Jan 1970/);
  });
});
