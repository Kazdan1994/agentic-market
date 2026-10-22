import type { MigrationInterface, QueryRunner } from "typeorm";

export class AuditEvents1761130000002 implements MigrationInterface {
  name = "AuditEvents1761130000002";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE audit_actor_type AS ENUM ('user', 'mandate_key', 'system')
    `);
    await queryRunner.query(`
      CREATE TYPE audit_event_type AS ENUM (
        'mandate.created', 'mandate.revoked', 'key.created', 'key.revoked',
        'mandate.check.allowed', 'mandate.check.refused', 'checkout.attempted',
        'payment.approved', 'payment.declined', 'order.placed', 'run.interrupted'
      )
    `);
    await queryRunner.query(`
      CREATE TABLE audit_events (
        id uuid PRIMARY KEY,
        at timestamptz NOT NULL,
        actor_type audit_actor_type NOT NULL,
        actor_id uuid NOT NULL,
        mandate_id uuid NULL,
        type audit_event_type NOT NULL,
        payload jsonb NOT NULL,
        correlation_id uuid NOT NULL
      )
    `);
    await queryRunner.query(`CREATE INDEX audit_events_mandate_idx ON audit_events (mandate_id, at)`);
    await queryRunner.query(`
      CREATE TRIGGER audit_events_append_only
      BEFORE UPDATE OR DELETE ON audit_events
      FOR EACH ROW EXECUTE FUNCTION forbid_update_delete()
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE audit_events`);
    await queryRunner.query(`DROP TYPE audit_event_type`);
    await queryRunner.query(`DROP TYPE audit_actor_type`);
  }
}
