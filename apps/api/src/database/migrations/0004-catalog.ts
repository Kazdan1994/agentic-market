import type { MigrationInterface, QueryRunner } from "typeorm";

export class Catalog1761130000004 implements MigrationInterface {
  name = "Catalog1761130000004";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE merchants (
        id uuid PRIMARY KEY,
        slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]+$'),
        name text NOT NULL
      )
    `);
    await queryRunner.query(`
      CREATE TABLE categories (
        id uuid PRIMARY KEY,
        slug text NOT NULL UNIQUE,
        name text NOT NULL
      )
    `);
    await queryRunner.query(`
      CREATE TABLE products (
        id uuid PRIMARY KEY,
        merchant_id uuid NOT NULL REFERENCES merchants (id),
        category_id uuid NOT NULL REFERENCES categories (id),
        item_ref text NOT NULL,
        name text NOT NULL,
        description text NOT NULL,
        price_minor integer NOT NULL CHECK (price_minor > 0),
        currency char(3) NOT NULL CHECK (currency = 'EUR'),
        stock integer NOT NULL CHECK (stock >= 0),
        listed_at timestamptz NOT NULL,
        UNIQUE (merchant_id, item_ref)
      )
    `);
    await queryRunner.query(`CREATE INDEX products_category_idx ON products (category_id)`);
    await queryRunner.query(`CREATE INDEX products_item_ref_idx ON products (item_ref)`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE products`);
    await queryRunner.query(`DROP TABLE categories`);
    await queryRunner.query(`DROP TABLE merchants`);
  }
}
