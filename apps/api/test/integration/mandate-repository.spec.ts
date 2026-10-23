import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { seedCatalog } from "../../src/database/seed/seed-catalog";
import { seedUsers } from "../../src/database/seed/seed-users";
import { Argon2PasswordHasher } from "../../src/identity/infrastructure/argon2-password-hasher";
import { Agent } from "../../src/mandates/domain/agent";
import { Mandate } from "../../src/mandates/domain/mandate";
import { MandateKey, MandateKeySecrets } from "../../src/mandates/domain/mandate-key";
import { TypeOrmMandateActivityLog } from "../../src/mandates/infrastructure/typeorm-mandate-activity-log";
import { TypeOrmMandateRepository } from "../../src/mandates/infrastructure/typeorm-mandate-repository";
import { UuidV7Generator } from "../../src/shared/infrastructure/uuidv7-generator";
import { FixedClock } from "../support/fixed-clock";
import { closeTestDataSource, getTestDataSource, truncateAll } from "../support/postgres";

const NOW = new Date("2026-10-23T12:00:00Z");
const ALICE = "01900000-0000-7000-8000-00000000a11c";
const AGENT_ID = "00000000-0000-7000-8000-0000000000a1";
const MANDATE_ID = "00000000-0000-7000-8000-0000000000b1";
const KEY_ID = "00000000-0000-7000-8000-0000000000c1";

async function categoryIds(slugs: string[]): Promise<string[]> {
  const ds = await getTestDataSource();
  const rows: { id: string }[] = await ds.query("SELECT id FROM categories WHERE slug = ANY($1) ORDER BY slug", [slugs]);
  return rows.map((r) => r.id);
}

async function createMandate() {
  const ds = await getTestDataSource();
  const repo = new TypeOrmMandateRepository(ds);
  const agent = Agent.create({ id: AGENT_ID, userId: ALICE, name: "Runner", createdAt: NOW });
  const mandate = Mandate.create(
    {
      id: MANDATE_ID,
      agentId: AGENT_ID,
      userId: ALICE,
      perPurchaseCapMinor: 10_000,
      totalBudgetMinor: 15_000,
      categoryIds: await categoryIds(["audio", "sports"]),
      expiresAt: new Date("2030-01-01T00:00:00Z"),
    },
    NOW,
  );
  const material = MandateKeySecrets.deriveBuiltin("k".repeat(32), MANDATE_ID);
  const key = MandateKey.restore({
    id: KEY_ID,
    mandateId: MANDATE_ID,
    kind: "builtin",
    keyHash: material.keyHash,
    hint: material.hint,
    label: null,
    createdAt: NOW,
    revokedAt: null,
  });
  await repo.create(agent, mandate, key);
  return { ds, repo, mandate, material };
}

describe("TypeOrmMandateRepository (Postgres)", () => {
  beforeEach(async () => {
    await truncateAll();
    const ds = await getTestDataSource();
    await seedUsers(ds, new Argon2PasswordHasher(), "demo-password");
    await seedCatalog(ds);
  });
  afterAll(closeTestDataSource);

  it("saves and loads a mandate with its categories", async () => {
    const { repo, mandate } = await createMandate();
    const loaded = await repo.findById(MANDATE_ID);
    expect(loaded?.perPurchaseCapMinor).toBe(10_000);
    expect(loaded?.spentMinor).toBe(0);
    expect([...(loaded?.categoryIds ?? [])].sort()).toEqual([...mandate.categoryIds].sort());
    expect(loaded?.status(NOW)).toBe("active");
  });

  it("finds a mandate and its key by key hash", async () => {
    const { repo, material } = await createMandate();
    const found = await repo.findByKeyHash(MandateKeySecrets.hash(material.secret));
    expect(found?.mandate.id).toBe(MANDATE_ID);
    expect(found?.key.id).toBe(KEY_ID);
    expect(found?.key.kind).toBe("builtin");
    expect(await repo.findByKeyHash(MandateKeySecrets.hash("amk_unknown"))).toBeNull();
  });

  it("rejects spending above the total budget", async () => {
    const { ds } = await createMandate();
    await expect(ds.query("UPDATE mandates SET spent_minor = 15001 WHERE id = $1", [MANDATE_ID])).rejects.toThrow(
      /mandates_check/,
    );
  });

  it("keeps mandate activity append-only", async () => {
    const { ds } = await createMandate();
    await new TypeOrmMandateActivityLog(ds, new UuidV7Generator(), new FixedClock(NOW)).append({
      mandateId: MANDATE_ID,
      keyId: KEY_ID,
      action: "view_mandate",
      result: "ok",
      detail: {},
    });
    await expect(ds.query("UPDATE mandate_activity SET result = 'error'")).rejects.toThrow(/append-only/);
    await expect(ds.query("DELETE FROM mandate_activity")).rejects.toThrow(/append-only/);
  });
});
