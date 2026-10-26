import type { MigrationInterface, QueryRunner } from "typeorm";

export class AgentRuns1761130000007 implements MigrationInterface {
  name = "AgentRuns1761130000007";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE run_status AS ENUM ('running', 'completed')`);
    await queryRunner.query(
      `CREATE TYPE run_outcome AS ENUM ('order_placed', 'no_eligible_product', 'refused_by_mandate', 'payment_declined', 'interrupted')`,
    );
    await queryRunner.query(`CREATE TYPE run_strategy AS ENUM ('ai', 'rules')`);
    await queryRunner.query(
      `CREATE TYPE run_fallback_reason AS ENUM ('not_configured', 'forced_rules', 'unavailable', 'timeout', 'api_error', 'unusable_answer', 'ineligible_choice')`,
    );
    await queryRunner.query(`
      CREATE TABLE agent_runs (
        id uuid PRIMARY KEY,
        mandate_id uuid NOT NULL REFERENCES mandates (id),
        user_id uuid NOT NULL REFERENCES users (id),
        request text NOT NULL CHECK (char_length(request) BETWEEN 3 AND 500),
        status run_status NOT NULL,
        outcome run_outcome NULL,
        strategy run_strategy NULL,
        fallback_reason run_fallback_reason NULL,
        order_id uuid NULL REFERENCES orders (id),
        started_at timestamptz NOT NULL,
        ended_at timestamptz NULL,
        correlation_id uuid NOT NULL,
        CHECK ((status = 'completed') = (outcome IS NOT NULL AND ended_at IS NOT NULL)),
        CHECK ((outcome = 'order_placed') = (order_id IS NOT NULL))
      )
    `);
    // FR-010: at most one running run per mandate.
    await queryRunner.query(`CREATE UNIQUE INDEX agent_runs_one_running ON agent_runs (mandate_id) WHERE status = 'running'`);
    await queryRunner.query(`CREATE INDEX agent_runs_mandate_idx ON agent_runs (mandate_id, started_at DESC)`);
    await queryRunner.query(`ALTER TABLE orders ADD CONSTRAINT orders_run_fk FOREIGN KEY (run_id) REFERENCES agent_runs (id)`);

    await queryRunner.query(
      `CREATE TYPE run_step AS ENUM ('search', 'evaluation', 'selection', 'mandate_check', 'payment', 'outcome')`,
    );
    await queryRunner.query(`
      CREATE TABLE run_log_entries (
        run_id uuid NOT NULL REFERENCES agent_runs (id),
        seq integer NOT NULL CHECK (seq >= 1),
        at timestamptz NOT NULL,
        step run_step NOT NULL,
        message text NOT NULL,
        product_id uuid NULL,
        data jsonb NOT NULL,
        PRIMARY KEY (run_id, seq)
      )
    `);
    await queryRunner.query(`
      CREATE TRIGGER run_log_entries_append_only
      BEFORE UPDATE OR DELETE ON run_log_entries
      FOR EACH ROW EXECUTE FUNCTION forbid_update_delete()
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE run_log_entries`);
    await queryRunner.query(`DROP TYPE run_step`);
    await queryRunner.query(`ALTER TABLE orders DROP CONSTRAINT orders_run_fk`);
    await queryRunner.query(`DROP TABLE agent_runs`);
    await queryRunner.query(`DROP TYPE run_fallback_reason`);
    await queryRunner.query(`DROP TYPE run_strategy`);
    await queryRunner.query(`DROP TYPE run_outcome`);
    await queryRunner.query(`DROP TYPE run_status`);
  }
}
