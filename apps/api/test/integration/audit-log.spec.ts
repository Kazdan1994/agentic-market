import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { TypeOrmAuditLog } from "../../src/shared/audit/typeorm-audit-log";
import { UuidV7Generator } from "../../src/shared/infrastructure/uuidv7-generator";
import { CorrelationContext } from "../../src/shared/correlation/correlation-context";
import { closeTestDataSource, getTestDataSource, truncateAll } from "../support/postgres";

const CORRELATION_ID = "5b0f3c2a-8e4d-4c1b-9a7f-1e2d3c4b5a69";

describe("audit log (Postgres)", () => {
  beforeEach(truncateAll);
  afterAll(closeTestDataSource);

  async function appendOne() {
    const ds = await getTestDataSource();
    const auditLog = new TypeOrmAuditLog(ds, new UuidV7Generator());
    await CorrelationContext.run(CORRELATION_ID, () =>
      auditLog.append({
        type: "mandate.created",
        actorType: "user",
        actorId: "0b9a3f7e-6f1a-4c57-9a8d-2f4f3f9c1e11",
        mandateId: null,
        payload: { totalBudgetMinor: 15000 },
      }),
    );
    return ds;
  }

  it("stores events with the current correlation id", async () => {
    const ds = await appendOne();
    const rows: { type: string; correlation_id: string; payload: unknown }[] = await ds.query(
      "SELECT type, correlation_id, payload FROM audit_events",
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      type: "mandate.created",
      correlation_id: CORRELATION_ID,
      payload: { totalBudgetMinor: 15000 },
    });
  });

  it("rejects UPDATE and DELETE (append-only)", async () => {
    const ds = await appendOne();
    await expect(ds.query("UPDATE audit_events SET payload = '{}'")).rejects.toThrow(/append-only/);
    await expect(ds.query("DELETE FROM audit_events")).rejects.toThrow(/append-only/);
  });

  it("rejects unknown event types", async () => {
    const ds = await getTestDataSource();
    await expect(
      ds.query(
        `INSERT INTO audit_events (id, at, actor_type, actor_id, type, payload, correlation_id)
         VALUES (gen_random_uuid(), now(), 'user', gen_random_uuid(), 'made.up', '{}', gen_random_uuid())`,
      ),
    ).rejects.toThrow();
  });
});
