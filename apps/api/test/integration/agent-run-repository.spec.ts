import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { AgentRun } from "../../src/agent/domain/agent-run";
import { RunLog } from "../../src/agent/domain/run-log-entry";
import { TypeOrmAgentRunRepository } from "../../src/agent/infrastructure/typeorm-agent-run-repository";
import { seedCatalog } from "../../src/database/seed/seed-catalog";
import { seedUsers } from "../../src/database/seed/seed-users";
import { Argon2PasswordHasher } from "../../src/identity/infrastructure/argon2-password-hasher";
import { Agent } from "../../src/mandates/domain/agent";
import { Mandate } from "../../src/mandates/domain/mandate";
import { MandateKey, MandateKeySecrets } from "../../src/mandates/domain/mandate-key";
import { TypeOrmMandateRepository } from "../../src/mandates/infrastructure/typeorm-mandate-repository";
import { DomainError } from "../../src/shared/errors/domain-error";
import { closeTestDataSource, getTestDataSource, truncateAll } from "../support/postgres";

const ALICE = "01900000-0000-7000-8000-00000000a11c";
const MANDATE_ID = "00000000-0000-7000-8000-0000000000b1";
const NOW = new Date();

const newRun = (id: string) =>
  AgentRun.start({
    id,
    mandateId: MANDATE_ID,
    userId: ALICE,
    request: "wireless headphones",
    correlationId: "00000000-0000-7000-8000-0000000000cc",
    now: NOW,
  });

describe("TypeOrmAgentRunRepository (Postgres)", () => {
  let repo: TypeOrmAgentRunRepository;

  beforeEach(async () => {
    await truncateAll();
    const ds = await getTestDataSource();
    await seedUsers(ds, new Argon2PasswordHasher(), "demo-password");
    await seedCatalog(ds);
    const [audio] = await ds.query("SELECT id FROM categories WHERE slug = 'audio'");
    const material = MandateKeySecrets.deriveBuiltin("k".repeat(32), MANDATE_ID);
    await new TypeOrmMandateRepository(ds).create(
      Agent.create({ id: "00000000-0000-7000-8000-0000000000a1", userId: ALICE, name: "Runner", createdAt: NOW }),
      Mandate.create(
        {
          id: MANDATE_ID,
          agentId: "00000000-0000-7000-8000-0000000000a1",
          userId: ALICE,
          perPurchaseCapMinor: 10_000,
          totalBudgetMinor: 15_000,
          categoryIds: [(audio as { id: string }).id],
          expiresAt: new Date(NOW.getTime() + 86_400_000),
        },
        NOW,
      ),
      MandateKey.restore({
        id: "00000000-0000-7000-8000-0000000000d1",
        mandateId: MANDATE_ID,
        kind: "builtin",
        keyHash: material.keyHash,
        hint: material.hint,
        label: null,
        createdAt: NOW,
        revokedAt: null,
      }),
    );
    repo = new TypeOrmAgentRunRepository(ds);
  });
  afterAll(closeTestDataSource);

  it("refuses a second running run for the same mandate", async () => {
    await repo.insert(newRun("00000000-0000-7000-8000-000000000101"));
    const error = await repo.insert(newRun("00000000-0000-7000-8000-000000000102")).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(DomainError);
    expect((error as DomainError).code).toBe("RUN_ALREADY_IN_PROGRESS");
  });

  it("allows a new run once the previous one completed", async () => {
    const first = newRun("00000000-0000-7000-8000-000000000101");
    await repo.insert(first);
    await repo.complete(
      first.complete({ outcome: "no_eligible_product", strategy: "rules", fallbackReason: null, orderId: null, now: new Date() }),
    );
    await repo.insert(newRun("00000000-0000-7000-8000-000000000102"));
    expect((await repo.findById("00000000-0000-7000-8000-000000000101"))?.outcome).toBe("no_eligible_product");
    expect((await repo.findRunning()).map((r) => r.id)).toEqual(["00000000-0000-7000-8000-000000000102"]);
  });

  it("returns log entries in seq order, after a given seq", async () => {
    const run = newRun("00000000-0000-7000-8000-000000000101");
    await repo.insert(run);
    let log = RunLog.empty(run.id);
    for (const step of ["search", "evaluation", "selection"] as const) {
      const appended = log.append({ step, message: `${step} done`, productId: null, data: { step } }, new Date());
      await repo.appendLog(appended.entry);
      log = appended.log;
    }
    expect((await repo.listLog(run.id)).map((e) => e.seq)).toEqual([1, 2, 3]);
    expect((await repo.listLog(run.id, 1)).map((e) => e.step)).toEqual(["evaluation", "selection"]);
    expect(await repo.lastSeq(run.id)).toBe(3);
  });

  it("keeps the decision log append-only", async () => {
    const run = newRun("00000000-0000-7000-8000-000000000101");
    await repo.insert(run);
    await repo.appendLog(RunLog.empty(run.id).append({ step: "search", message: "x", productId: null, data: {} }, new Date()).entry);
    const ds = await getTestDataSource();
    await expect(ds.query("UPDATE run_log_entries SET message = 'y'")).rejects.toThrow(/append-only/);
    await expect(ds.query("DELETE FROM run_log_entries")).rejects.toThrow(/append-only/);
  });
});
