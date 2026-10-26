import type { MigrationInterface, QueryRunner } from "typeorm";

export class Users1761130000003 implements MigrationInterface {
  name = "Users1761130000003";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE users (
        id uuid PRIMARY KEY,
        email text NOT NULL UNIQUE CHECK (email = lower(email)),
        display_name text NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 80),
        password_hash text NOT NULL,
        created_at timestamptz NOT NULL
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE users`);
  }
}
