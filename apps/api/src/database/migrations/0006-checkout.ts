import type { MigrationInterface, QueryRunner } from "typeorm";

export class Checkout1761130000006 implements MigrationInterface {
  name = "Checkout1761130000006";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE payment_outcome AS ENUM ('approved', 'declined')`);
    await queryRunner.query(`
      CREATE TABLE payments (
        id uuid PRIMARY KEY,
        mandate_id uuid NOT NULL REFERENCES mandates (id),
        key_id uuid NOT NULL REFERENCES mandate_keys (id),
        idempotency_key text NOT NULL CHECK (char_length(idempotency_key) BETWEEN 8 AND 100),
        request_hash bytea NOT NULL,
        product_id uuid NOT NULL REFERENCES products (id),
        amount_minor integer NOT NULL CHECK (amount_minor > 0),
        currency char(3) NOT NULL,
        outcome payment_outcome NOT NULL,
        reference text NOT NULL UNIQUE,
        created_at timestamptz NOT NULL,
        UNIQUE (mandate_id, idempotency_key)
      )
    `);
    await queryRunner.query(`CREATE TYPE order_status AS ENUM ('paid_simulated')`);
    // run_id gets its foreign key when agent_runs exists (slice 6a).
    await queryRunner.query(`
      CREATE TABLE orders (
        id uuid PRIMARY KEY,
        user_id uuid NOT NULL REFERENCES users (id),
        mandate_id uuid NOT NULL REFERENCES mandates (id),
        merchant_id uuid NOT NULL REFERENCES merchants (id),
        product_id uuid NOT NULL REFERENCES products (id),
        run_id uuid NULL,
        key_id uuid NOT NULL REFERENCES mandate_keys (id),
        payment_id uuid NOT NULL UNIQUE REFERENCES payments (id),
        product_name text NOT NULL,
        merchant_name text NOT NULL,
        unit_price_minor integer NOT NULL CHECK (unit_price_minor > 0),
        quantity integer NOT NULL CHECK (quantity = 1),
        total_minor integer NOT NULL,
        currency char(3) NOT NULL,
        status order_status NOT NULL,
        placed_at timestamptz NOT NULL,
        CHECK (total_minor = unit_price_minor * quantity)
      )
    `);
    await queryRunner.query(`CREATE INDEX orders_user_idx ON orders (user_id, placed_at DESC)`);
    await queryRunner.query(`CREATE INDEX orders_mandate_idx ON orders (mandate_id, placed_at DESC)`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE orders`);
    await queryRunner.query(`DROP TYPE order_status`);
    await queryRunner.query(`DROP TABLE payments`);
    await queryRunner.query(`DROP TYPE payment_outcome`);
  }
}
