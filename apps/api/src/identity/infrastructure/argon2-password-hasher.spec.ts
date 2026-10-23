import { describe, expect, it } from "vitest";
import { Argon2PasswordHasher } from "./argon2-password-hasher";

describe("Argon2PasswordHasher", () => {
  const hasher = new Argon2PasswordHasher();

  it("produces a salted argon2id PHC string that verifies", async () => {
    const hash = await hasher.hash("correct horse");
    expect(hash).toMatch(/^\$argon2id\$v=19\$m=\d+,t=\d+,p=\d+\$[A-Za-z0-9+/]+\$[A-Za-z0-9+/]+$/);
    expect(await hasher.hash("correct horse")).not.toBe(hash);
    expect(await hasher.verify("correct horse", hash)).toBe(true);
    expect(await hasher.verify("wrong", hash)).toBe(false);
  });

  it("returns false for a malformed hash", async () => {
    expect(await hasher.verify("x", "not-a-hash")).toBe(false);
  });
});
