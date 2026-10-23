import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { CheckoutCommand, CheckoutHandler } from "../../src/checkout/application/checkout.handler";
import { SimulatedPaymentGateway } from "../../src/checkout/infrastructure/simulated-payment-gateway";
import { TypeOrmCheckoutUnitOfWork } from "../../src/checkout/infrastructure/typeorm-checkout-unit-of-work";
import { seedCatalog } from "../../src/database/seed/seed-catalog";
import { seedUsers } from "../../src/database/seed/seed-users";
import { Argon2PasswordHasher } from "../../src/identity/infrastructure/argon2-password-hasher";
import { Agent } from "../../src/mandates/domain/agent";
import { Mandate } from "../../src/mandates/domain/mandate";
import { MandateKey, MandateKeySecrets } from "../../src/mandates/domain/mandate-key";
import { TypeOrmMandateRepository } from "../../src/mandates/infrastructure/typeorm-mandate-repository";
import { DomainError } from "../../src/shared/errors/domain-error";
import { SystemClock } from "../../src/shared/infrastructure/system-clock";
import { UuidV7Generator } from "../../src/shared/infrastructure/uuidv7-generator";
import { closeTestDataSource, getTestDataSource, truncateAll } from "../support/postgres";

const ALICE = "01900000-0000-7000-8000-00000000a11c";
const MANDATE_ID = "00000000-0000-7000-8000-0000000000b1";
const KEY_ID = "00000000-0000-7000-8000-0000000000d1";
const silent = { info: () => undefined };

async function product(itemRef: string, merchant: string): Promise<{ id: string; price: number }> {
  const ds = await getTestDataSource();
  const [row] = await ds.query(
    `SELECT p.id, p.price_minor FROM products p JOIN merchants m ON m.id = p.merchant_id
     WHERE p.item_ref = $1 AND m.slug = $2`,
    [itemRef, merchant],
  );
  return { id: (row as { id: string }).id, price: (row as { price_minor: number }).price_minor };
}

async function setupMandate(perPurchaseCapMinor: number, totalBudgetMinor: number) {
  const ds = await getTestDataSource();
  const [audio] = await ds.query("SELECT id FROM categories WHERE slug = 'audio'");
  const now = new Date();
  const material = MandateKeySecrets.deriveBuiltin("k".repeat(32), MANDATE_ID);
  await new TypeOrmMandateRepository(ds).create(
    Agent.create({ id: "00000000-0000-7000-8000-0000000000a1", userId: ALICE, name: "Runner", createdAt: now }),
    Mandate.create(
      {
        id: MANDATE_ID,
        agentId: "00000000-0000-7000-8000-0000000000a1",
        userId: ALICE,
        perPurchaseCapMinor,
        totalBudgetMinor,
        categoryIds: [(audio as { id: string }).id],
        expiresAt: new Date(now.getTime() + 86_400_000),
      },
      now,
    ),
    MandateKey.restore({
      id: KEY_ID,
      mandateId: MANDATE_ID,
      kind: "builtin",
      keyHash: material.keyHash,
      hint: material.hint,
      label: null,
      createdAt: now,
      revokedAt: null,
    }),
  );
}

async function checkout(productId: string, price: number, idempotencyKey: string) {
  const ds = await getTestDataSource();
  const handler = new CheckoutHandler(
    new TypeOrmCheckoutUnitOfWork(ds),
    new SimulatedPaymentGateway({ SIMULATED_DECLINE_CENTS: 13 }),
    new SystemClock(),
    new UuidV7Generator(),
    silent,
  );
  return handler.execute(new CheckoutCommand(MANDATE_ID, KEY_ID, "builtin", productId, price, idempotencyKey));
}

const codeOf = (result: PromiseSettledResult<unknown>) =>
  result.status === "rejected" && result.reason instanceof DomainError ? result.reason.code : result.status;

describe("checkout transaction (Postgres)", () => {
  beforeEach(async () => {
    await truncateAll();
    const ds = await getTestDataSource();
    await seedUsers(ds, new Argon2PasswordHasher(), "demo-password");
    await seedCatalog(ds);
  });
  afterAll(closeTestDataSource);

  it("lets only one of two concurrent checkouts through when together they exceed the budget", async () => {
    await setupMandate(10_000, 12_000);
    const a = await product("audio-runbuds-pro", "techcorner"); // 79.00
    const b = await product("audio-runbuds-pro", "soundhub"); // 89.00
    const results = await Promise.allSettled([checkout(a.id, a.price, "idem-key-a"), checkout(b.id, b.price, "idem-key-b")]);
    expect(results.map(codeOf).sort()).toEqual(["OVER_REMAINING_BUDGET", "fulfilled"]);
    const ds = await getTestDataSource();
    const [m] = await ds.query("SELECT spent_minor FROM mandates WHERE id = $1", [MANDATE_ID]);
    expect([7_900, 8_900]).toContain((m as { spent_minor: number }).spent_minor);
  });

  it("sells the last unit once", async () => {
    await setupMandate(10_000, 50_000);
    const p = await product("audio-runbuds-pro", "techcorner");
    const ds = await getTestDataSource();
    await ds.query("UPDATE products SET stock = 1 WHERE id = $1", [p.id]);
    const results = await Promise.allSettled([checkout(p.id, p.price, "idem-key-1"), checkout(p.id, p.price, "idem-key-2")]);
    expect(results.map(codeOf).sort()).toEqual(["OUT_OF_STOCK", "fulfilled"]);
  });

  it("charges once for concurrent requests with one idempotency key", async () => {
    await setupMandate(10_000, 50_000);
    const p = await product("audio-runbuds-pro", "techcorner");
    const orders = await Promise.all([1, 2, 3].map(() => checkout(p.id, p.price, "idem-key-race")));
    expect(new Set(orders.map((o) => o.id)).size).toBe(1);
    const ds = await getTestDataSource();
    const [m] = await ds.query("SELECT spent_minor FROM mandates WHERE id = $1", [MANDATE_ID]);
    expect((m as { spent_minor: number }).spent_minor).toBe(p.price);
  });

  it("charges once for 10 replays of one idempotency key", async () => {
    await setupMandate(10_000, 50_000);
    const p = await product("audio-runbuds-pro", "techcorner");
    const orders = [];
    for (let i = 0; i < 10; i += 1) orders.push(await checkout(p.id, p.price, "idem-key-replay"));
    expect(new Set(orders.map((o) => o.id)).size).toBe(1);
    const ds = await getTestDataSource();
    const [payments] = await ds.query("SELECT count(*)::int AS n FROM payments");
    const [orderRows] = await ds.query("SELECT count(*)::int AS n FROM orders");
    expect((payments as { n: number }).n).toBe(1);
    expect((orderRows as { n: number }).n).toBe(1);
  });
});
