import { describe, expect, it } from "vitest";
import { DomainError } from "../../shared/errors/domain-error";
import { User } from "../domain/user";
import type { PasswordHasher } from "../domain/password-hasher";
import type { UserRepository } from "../domain/user-repository";
import { LoginCommand, LoginHandler } from "./login.handler";

const alice = User.create({
  id: "00000000-0000-7000-8000-000000000001",
  email: "alice@demo.local",
  displayName: "Alice",
  passwordHash: "hash:right",
  createdAt: new Date("2026-10-23T00:00:00Z"),
});

const users: UserRepository = {
  findByEmail: async (email) => (email.trim().toLowerCase() === alice.email ? alice : null),
  findById: async (id) => (id === alice.id ? alice : null),
  save: async () => undefined,
};

const hasher: PasswordHasher = {
  hash: async (password) => `hash:${password}`,
  verify: async (password, hash) => hash === `hash:${password}`,
};

async function failure(command: LoginCommand): Promise<DomainError> {
  try {
    await new LoginHandler(users, hasher).execute(command);
  } catch (error) {
    if (error instanceof DomainError) return error;
    throw error;
  }
  throw new Error("expected login to fail");
}

describe("LoginHandler", () => {
  it("returns the user id for a correct password", async () => {
    const result = await new LoginHandler(users, hasher).execute(
      new LoginCommand("Alice@demo.local", "right"),
    );
    expect(result).toEqual({ userId: alice.id });
  });

  it("refuses unknown emails and wrong passwords with the same error", async () => {
    const unknown = await failure(new LoginCommand("nobody@demo.local", "right"));
    const wrong = await failure(new LoginCommand("alice@demo.local", "wrong"));
    expect(unknown.code).toBe("UNAUTHORIZED");
    expect(wrong.code).toBe("UNAUTHORIZED");
    expect(unknown.message).toBe(wrong.message);
  });
});
