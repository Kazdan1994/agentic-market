import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity({ name: "payments" })
export class PaymentEntity {
  @PrimaryColumn("uuid")
  id!: string;
  @Column({ name: "mandate_id", type: "uuid" })
  mandateId!: string;
  @Column({ name: "key_id", type: "uuid" })
  keyId!: string;
  @Column({ name: "idempotency_key", type: "text" })
  idempotencyKey!: string;
  @Column({ name: "request_hash", type: "bytea" })
  requestHash!: Buffer;
  @Column({ name: "product_id", type: "uuid" })
  productId!: string;
  @Column({ name: "amount_minor", type: "integer" })
  amountMinor!: number;
  @Column({ type: "char", length: 3 })
  currency!: string;
  @Column({ type: "enum", enum: ["approved", "declined"], enumName: "payment_outcome" })
  outcome!: "approved" | "declined";
  @Column({ type: "text" })
  reference!: string;
  @Column({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;
}

@Entity({ name: "orders" })
export class OrderEntity {
  @PrimaryColumn("uuid")
  id!: string;
  @Column({ name: "user_id", type: "uuid" })
  userId!: string;
  @Column({ name: "mandate_id", type: "uuid" })
  mandateId!: string;
  @Column({ name: "merchant_id", type: "uuid" })
  merchantId!: string;
  @Column({ name: "product_id", type: "uuid" })
  productId!: string;
  @Column({ name: "run_id", type: "uuid", nullable: true })
  runId!: string | null;
  @Column({ name: "key_id", type: "uuid" })
  keyId!: string;
  @Column({ name: "payment_id", type: "uuid" })
  paymentId!: string;
  @Column({ name: "product_name", type: "text" })
  productName!: string;
  @Column({ name: "merchant_name", type: "text" })
  merchantName!: string;
  @Column({ name: "unit_price_minor", type: "integer" })
  unitPriceMinor!: number;
  @Column({ type: "integer" })
  quantity!: number;
  @Column({ name: "total_minor", type: "integer" })
  totalMinor!: number;
  @Column({ type: "char", length: 3 })
  currency!: string;
  @Column({ type: "enum", enum: ["paid_simulated"], enumName: "order_status" })
  status!: "paid_simulated";
  @Column({ name: "placed_at", type: "timestamptz" })
  placedAt!: Date;
}
