import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity({ name: "mandates" })
export class MandateEntity {
  @PrimaryColumn("uuid")
  id!: string;

  @Column({ name: "agent_id", type: "uuid" })
  agentId!: string;

  @Column({ name: "user_id", type: "uuid" })
  userId!: string;

  @Column({ name: "per_purchase_cap_minor", type: "integer" })
  perPurchaseCapMinor!: number;

  @Column({ name: "total_budget_minor", type: "integer" })
  totalBudgetMinor!: number;

  @Column({ name: "spent_minor", type: "integer" })
  spentMinor!: number;

  @Column({ type: "char", length: 3 })
  currency!: string;

  @Column({ name: "expires_at", type: "timestamptz" })
  expiresAt!: Date;

  @Column({ name: "revoked_at", type: "timestamptz", nullable: true })
  revokedAt!: Date | null;

  @Column({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;
}

@Entity({ name: "mandate_categories" })
export class MandateCategoryEntity {
  @PrimaryColumn({ name: "mandate_id", type: "uuid" })
  mandateId!: string;

  @PrimaryColumn({ name: "category_id", type: "uuid" })
  categoryId!: string;
}
