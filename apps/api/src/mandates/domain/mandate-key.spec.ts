import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { MandateKeySecrets } from "./mandate-key";

const SECRET_PATTERN = /^amk_[A-Za-z0-9_-]{43}$/;
const MANDATE_ID = "00000000-0000-7000-8000-000000000001";

describe("MandateKeySecrets", () => {
  it("generates random external secrets of amk_ + 43 base64url chars", () => {
    const a = MandateKeySecrets.generateExternal();
    const b = MandateKeySecrets.generateExternal();
    expect(a.secret).toMatch(SECRET_PATTERN);
    expect(a.secret).not.toBe(b.secret);
  });

  it("derives the same built-in secret for the same mandate", () => {
    const one = MandateKeySecrets.deriveBuiltin("k".repeat(32), MANDATE_ID);
    const two = MandateKeySecrets.deriveBuiltin("k".repeat(32), MANDATE_ID);
    expect(one.secret).toMatch(SECRET_PATTERN);
    expect(one.secret).toBe(two.secret);
    expect(MandateKeySecrets.deriveBuiltin("k".repeat(32), "00000000-0000-7000-8000-000000000002").secret).not.toBe(
      one.secret,
    );
  });

  it("keeps only a SHA-256 hash and the last 4 characters", () => {
    const material = MandateKeySecrets.generateExternal();
    expect(material.keyHash).toEqual(createHash("sha256").update(material.secret).digest());
    expect(material.hint).toBe(material.secret.slice(-4));
    expect(MandateKeySecrets.hash(material.secret)).toEqual(material.keyHash);
  });
});
