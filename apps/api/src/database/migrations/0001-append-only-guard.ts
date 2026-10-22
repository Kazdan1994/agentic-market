import type { MigrationInterface, QueryRunner } from "typeorm";

/** Shared trigger function that makes a table append-only (research R14). */
export class AppendOnlyGuard1761130000001 implements MigrationInterface {
  name = "AppendOnlyGuard1761130000001";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE FUNCTION forbid_update_delete() RETURNS trigger
      LANGUAGE plpgsql AS $$
      BEGIN
        RAISE EXCEPTION 'table % is append-only: % is not allowed', TG_TABLE_NAME, TG_OP;
      END;
      $$
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP FUNCTION forbid_update_delete()`);
  }
}
