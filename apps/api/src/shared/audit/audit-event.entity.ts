import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity({ name: "audit_events" })
export class AuditEventEntity {
  @PrimaryColumn("uuid")
  id!: string;

  @Column({ type: "timestamptz" })
  at!: Date;

  @Column({ name: "actor_type", type: "enum", enum: ["user", "mandate_key", "system"], enumName: "audit_actor_type" })
  actorType!: string;

  @Column({ name: "actor_id", type: "uuid" })
  actorId!: string;

  @Column({ name: "mandate_id", type: "uuid", nullable: true })
  mandateId!: string | null;

  @Column({ type: "varchar" })
  type!: string;

  @Column({ type: "jsonb" })
  payload!: object;

  @Column({ name: "correlation_id", type: "uuid" })
  correlationId!: string;
}
