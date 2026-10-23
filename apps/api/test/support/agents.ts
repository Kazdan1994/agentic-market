import { randomUUID } from "node:crypto";
import request from "supertest";
import { MandateKeySecrets } from "../../src/mandates/domain/mandate-key";
import { getTestDataSource } from "./postgres";

export interface TestMandate {
  agentId: string;
  mandateId: string;
  /** Built-in key secret, derived like the run executor does. */
  builtinKey: string;
}

/** Creates an agent through the API and returns its mandate and built-in key. */
export async function createAgent(
  baseUrl: string,
  cookie: string,
  overrides: Record<string, unknown> = {},
): Promise<TestMandate> {
  const res = await request(baseUrl)
    .post("/v1/agents")
    .set("Cookie", cookie)
    .send({
      name: "Runner",
      perPurchaseCapMinor: 10_000,
      totalBudgetMinor: 15_000,
      categorySlugs: ["audio"],
      expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
      ...overrides,
    });
  if (res.status !== 201) throw new Error(`create agent failed with ${res.status}: ${JSON.stringify(res.body)}`);
  const mandateId = res.body.mandate.id as string;
  const secret = process.env.BUILTIN_KEY_SECRET;
  if (!secret) throw new Error("BUILTIN_KEY_SECRET is not set; create the app with createTestApp first");
  return {
    agentId: res.body.id as string,
    mandateId,
    builtinKey: MandateKeySecrets.deriveBuiltin(secret, mandateId).secret,
  };
}

/** Inserts an external key directly (the key endpoints arrive in slice 10b). */
export async function insertExternalKey(mandateId: string): Promise<string> {
  const material = MandateKeySecrets.generateExternal();
  const ds = await getTestDataSource();
  await ds.query(
    `INSERT INTO mandate_keys (id, mandate_id, kind, key_hash, hint, label, created_at)
     VALUES ($1, $2, 'external', $3, $4, 'test', now())`,
    [randomUUID(), mandateId, material.keyHash, material.hint],
  );
  return material.secret;
}

/** Inserts a running run, as the run executor does before it calls checkout. */
export async function insertRunningRun(mandateId: string): Promise<string> {
  const ds = await getTestDataSource();
  const runId = randomUUID();
  await ds.query(
    `INSERT INTO agent_runs (id, mandate_id, user_id, request, status, started_at, correlation_id)
     SELECT $1, id, user_id, 'test request', 'running', now(), $1 FROM mandates WHERE id = $2`,
    [runId, mandateId],
  );
  return runId;
}

export async function productId(itemRef: string, merchantSlug: string): Promise<{ id: string; priceMinor: number }> {
  const ds = await getTestDataSource();
  const [row] = await ds.query(
    `SELECT p.id, p.price_minor FROM products p JOIN merchants m ON m.id = p.merchant_id
     WHERE p.item_ref = $1 AND m.slug = $2`,
    [itemRef, merchantSlug],
  );
  if (!row) throw new Error(`no product ${itemRef} at ${merchantSlug}`);
  return { id: (row as { id: string }).id, priceMinor: (row as { price_minor: number }).price_minor };
}
