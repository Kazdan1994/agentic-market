import { Column, Entity, PrimaryColumn } from "typeorm";
import type { FallbackReason, RunOutcome, RunStatus, SelectionStrategy } from "../domain/agent-run";

@Entity({ name: "agent_runs" })
export class AgentRunEntity {
  @PrimaryColumn("uuid")
  id!: string;
  @Column({ name: "mandate_id", type: "uuid" })
  mandateId!: string;
  @Column({ name: "user_id", type: "uuid" })
  userId!: string;
  @Column({ type: "text" })
  request!: string;
  @Column({ type: "enum", enum: ["running", "completed"], enumName: "run_status" })
  status!: RunStatus;
  @Column({
    type: "enum",
    enum: ["order_placed", "no_eligible_product", "refused_by_mandate", "payment_declined", "interrupted"],
    enumName: "run_outcome",
    nullable: true,
  })
  outcome!: RunOutcome | null;
  @Column({ type: "enum", enum: ["ai", "rules"], enumName: "run_strategy", nullable: true })
  strategy!: SelectionStrategy | null;
  @Column({
    name: "fallback_reason",
    type: "enum",
    enum: ["not_configured", "forced_rules", "unavailable", "timeout", "api_error", "unusable_answer", "ineligible_choice", "no_eligible_candidates"],
    enumName: "run_fallback_reason",
    nullable: true,
  })
  fallbackReason!: FallbackReason | null;
  @Column({ name: "order_id", type: "uuid", nullable: true })
  orderId!: string | null;
  @Column({ name: "started_at", type: "timestamptz" })
  startedAt!: Date;
  @Column({ name: "ended_at", type: "timestamptz", nullable: true })
  endedAt!: Date | null;
  @Column({ name: "correlation_id", type: "uuid" })
  correlationId!: string;
}
