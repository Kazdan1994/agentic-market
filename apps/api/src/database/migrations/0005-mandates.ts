import type { MigrationInterface, QueryRunner } from "typeorm";

export class Mandates1761130000005 implements MigrationInterface {
  name = "Mandates1761130000005";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE agents (
        id uuid PRIMARY KEY,
        user_id uuid NOT NULL REFERENCES users (id),
        name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60),
        created_at timestamptz NOT NULL
      )
    `);
    await queryRunner.query(`CREATE INDEX agents_user_idx ON agents (user_id, created_at)`);
    await queryRunner.query(`
      CREATE TABLE mandates (
        id uuid PRIMARY KEY,
        agent_id uuid NOT NULL UNIQUE REFERENCES agents (id),
        user_id uuid NOT NULL REFERENCES users (id),
        per_purchase_cap_minor integer NOT NULL CHECK (per_purchase_cap_minor > 0),
        total_budget_minor integer NOT NULL CHECK (total_budget_minor > 0),
        spent_minor integer NOT NULL DEFAULT 0,
        currency char(3) NOT NULL CHECK (currency = 'EUR'),
        expires_at timestamptz NOT NULL,
        revoked_at timestamptz NULL,
        created_at timestamptz NOT NULL,
        CHECK (per_purchase_cap_minor <= total_budget_minor),
        CHECK (spent_minor >= 0 AND spent_minor <= total_budget_minor)
      )
    `);
    await queryRunner.query(`
      CREATE TABLE mandate_categories (
        mandate_id uuid NOT NULL REFERENCES mandates (id),
        category_id uuid NOT NULL REFERENCES categories (id),
        PRIMARY KEY (mandate_id, category_id)
      )
    `);
    await queryRunner.query(`CREATE TYPE mandate_key_kind AS ENUM ('builtin', 'external')`);
    await queryRunner.query(`
      CREATE TABLE mandate_keys (
        id uuid PRIMARY KEY,
        mandate_id uuid NOT NULL REFERENCES mandates (id),
        kind mandate_key_kind NOT NULL,
        key_hash bytea NOT NULL UNIQUE,
        hint text NOT NULL,
        label text NULL,
        created_at timestamptz NOT NULL,
        revoked_at timestamptz NULL
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX mandate_keys_one_builtin ON mandate_keys (mandate_id) WHERE kind = 'builtin'`,
    );
    await queryRunner.query(
      `CREATE TYPE mandate_activity_action AS ENUM ('search', 'view_product', 'view_mandate', 'checkout')`,
    );
    await queryRunner.query(
      `CREATE TYPE mandate_activity_result AS ENUM ('ok', 'refused', 'declined', 'error')`,
    );
    await queryRunner.query(`
      CREATE TABLE mandate_activity (
        id uuid PRIMARY KEY,
        mandate_id uuid NOT NULL REFERENCES mandates (id),
        key_id uuid NOT NULL REFERENCES mandate_keys (id),
        at timestamptz NOT NULL,
        action mandate_activity_action NOT NULL,
        result mandate_activity_result NOT NULL,
        detail jsonb NOT NULL,
        correlation_id uuid NOT NULL
      )
    `);
    await queryRunner.query(`CREATE INDEX mandate_activity_mandate_idx ON mandate_activity (mandate_id, at)`);
    await queryRunner.query(`
      CREATE TRIGGER mandate_activity_append_only
      BEFORE UPDATE OR DELETE ON mandate_activity
      FOR EACH ROW EXECUTE FUNCTION forbid_update_delete()
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE mandate_activity`);
    await queryRunner.query(`DROP TYPE mandate_activity_result`);
    await queryRunner.query(`DROP TYPE mandate_activity_action`);
    await queryRunner.query(`DROP TABLE mandate_keys`);
    await queryRunner.query(`DROP TYPE mandate_key_kind`);
    await queryRunner.query(`DROP TABLE mandate_categories`);
    await queryRunner.query(`DROP TABLE mandates`);
    await queryRunner.query(`DROP TABLE agents`);
  }
}
