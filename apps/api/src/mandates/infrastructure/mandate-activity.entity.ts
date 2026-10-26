import { Column, Entity, PrimaryColumn } from "typeorm";
import type { ActivityAction, ActivityResult } from "../domain/mandate-activity-log";

@Entity({ name: "mandate_activity" })
export class MandateActivityEntity {
  @PrimaryColumn("uuid")
  id!: string;

  @Column({ name: "mandate_id", type: "uuid" })
  mandateId!: string;

  @Column({ name: "key_id", type: "uuid" })
  keyId!: string;

  @Column({ type: "timestamptz" })
  at!: Date;

  @Column({
    type: "enum",
    enum: ["search", "view_product", "view_mandate", "checkout"],
    enumName: "mandate_activity_action",
  })
  action!: ActivityAction;

  @Column({ type: "enum", enum: ["ok", "refused", "declined", "error"], enumName: "mandate_activity_result" })
  result!: ActivityResult;

  @Column({ type: "jsonb" })
  detail!: object;

  @Column({ name: "correlation_id", type: "uuid" })
  correlationId!: string;
}
