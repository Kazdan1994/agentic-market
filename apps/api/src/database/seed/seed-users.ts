import type { DataSource } from "typeorm";
import type { PasswordHasher } from "../../identity/domain/password-hasher";
import { UserEntity } from "../../identity/infrastructure/user.entity";

// Fixed ids keep the seed idempotent and the demo data stable across resets.
const DEMO_USERS = [
  { id: "01900000-0000-7000-8000-00000000a11c", email: "alice@demo.local", displayName: "Alice" },
  { id: "01900000-0000-7000-8000-000000000b0b", email: "bob@demo.local", displayName: "Bob" },
] as const;

/** Inserts the demo users; existing rows (matched by email) are left untouched. */
export async function seedUsers(
  dataSource: DataSource,
  hasher: PasswordHasher,
  password: string,
): Promise<void> {
  for (const user of DEMO_USERS) {
    await dataSource
      .createQueryBuilder()
      .insert()
      .into(UserEntity)
      .values({ ...user, passwordHash: await hasher.hash(password), createdAt: new Date() })
      .orIgnore()
      .execute();
  }
}
