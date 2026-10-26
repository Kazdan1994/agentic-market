import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity({ name: "mandate_keys" })
export class MandateKeyEntity {
  @PrimaryColumn("uuid")
  id!: string;

  @Column({ name: "mandate_id", type: "uuid" })
  mandateId!: string;

  @Column({ type: "enum", enum: ["builtin", "external"], enumName: "mandate_key_kind" })
  kind!: "builtin" | "external";

  @Column({ name: "key_hash", type: "bytea" })
  keyHash!: Buffer;

  @Column({ type: "text" })
  hint!: string;

  @Column({ type: "text", nullable: true })
  label!: string | null;

  @Column({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @Column({ name: "revoked_at", type: "timestamptz", nullable: true })
  revokedAt!: Date | null;
}
