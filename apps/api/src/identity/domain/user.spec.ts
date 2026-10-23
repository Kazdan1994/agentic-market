import { describe, expect, it } from "vitest";
import { User } from "./user";

const base = {
  id: "00000000-0000-7000-8000-000000000001",
  email: "  Alice@Demo.Local ",
  displayName: "Alice",
  passwordHash: "$argon2id$hash",
  createdAt: new Date("2026-10-23T00:00:00Z"),
};

describe("User", () => {
  it("lower-cases and trims the email", () => {
    expect(User.create(base).email).toBe("alice@demo.local");
  });

  it("accepts display names of 1 to 80 characters", () => {
    expect(User.create({ ...base, displayName: "A" }).displayName).toBe("A");
    expect(User.create({ ...base, displayName: "A".repeat(80) }).displayName).toHaveLength(80);
  });

  it.each(["", "   ", "A".repeat(81)])("rejects display name %j", (displayName) => {
    expect(() => User.create({ ...base, displayName })).toThrow(/display name/i);
  });

  it("rejects an email without @", () => {
    expect(() => User.create({ ...base, email: "alice" })).toThrow(/email/i);
  });
});
