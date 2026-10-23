import { Column, Entity, PrimaryColumn } from "typeorm";
import type { RunStep } from "../domain/run-log-entry";

@Entity({ name: "run_log_entries" })
export class RunLogEntryEntity {
  @PrimaryColumn({ name: "run_id", type: "uuid" })
  runId!: string;
  @PrimaryColumn({ type: "integer" })
  seq!: number;
  @Column({ type: "timestamptz" })
  at!: Date;
  @Column({
    type: "enum",
    enum: ["search", "evaluation", "selection", "mandate_check", "payment", "outcome"],
    enumName: "run_step",
  })
  step!: RunStep;
  @Column({ type: "text" })
  message!: string;
  @Column({ name: "product_id", type: "uuid", nullable: true })
  productId!: string | null;
  @Column({ type: "jsonb" })
  data!: object;
}
