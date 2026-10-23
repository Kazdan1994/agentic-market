import request from "supertest";

export const DEMO_PASSWORD = "demo-password";

/** Signs in a seeded demo user and returns the `am_session=...` cookie pair. */
export async function loginAs(baseUrl: string, email: string): Promise<string> {
  const res = await request(baseUrl).post("/v1/auth/login").send({ email, password: DEMO_PASSWORD });
  const cookies = res.headers["set-cookie"] as unknown as string[] | undefined;
  const session = cookies?.find((c) => c.startsWith("am_session="))?.split(";")[0];
  if (res.status !== 204 || !session) throw new Error(`login as ${email} failed with ${res.status}`);
  return session;
}
