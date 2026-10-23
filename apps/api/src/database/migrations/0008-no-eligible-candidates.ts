import type { MigrationInterface, QueryRunner } from "typeorm";

export class NoEligibleCandidates1761130000008 implements MigrationInterface {
  name = "NoEligibleCandidates1761130000008";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TYPE run_fallback_reason ADD VALUE IF NOT EXISTS 'no_eligible_candidates'`);
  }

  async down(): Promise<void> {
    // Postgres cannot drop an enum value; rows using it would have to be rewritten first.
  }
}
