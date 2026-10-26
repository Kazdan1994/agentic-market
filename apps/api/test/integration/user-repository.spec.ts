import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { User } from "../../src/identity/domain/user";
import { TypeOrmUserRepository } from "../../src/identity/infrastructure/typeorm-user-repository";
import { closeTestDataSource, getTestDataSource, truncateAll } from "../support/postgres";

function makeUser(id: string, email: string): User {
  return User.create({
    id,
    email,
    displayName: "Alice",
    passwordHash: "hash",
    createdAt: new Date("2026-10-23T00:00:00Z"),
  });
}

describe("TypeOrmUserRepository (Postgres)", () => {
  beforeEach(truncateAll);
  afterAll(closeTestDataSource);

  it("finds users by email regardless of case", async () => {
    const repo = new TypeOrmUserRepository(await getTestDataSource());
    await repo.save(makeUser("00000000-0000-7000-8000-000000000001", "alice@demo.local"));
    const found = await repo.findByEmail("  ALICE@Demo.local");
    expect(found?.id).toBe("00000000-0000-7000-8000-000000000001");
    expect(await repo.findByEmail("bob@demo.local")).toBeNull();
  });

  it("keeps emails unique", async () => {
    const repo = new TypeOrmUserRepository(await getTestDataSource());
    await repo.save(makeUser("00000000-0000-7000-8000-000000000001", "alice@demo.local"));
    await expect(
      repo.save(makeUser("00000000-0000-7000-8000-000000000002", "Alice@demo.local")),
    ).rejects.toThrow();
  });
});
