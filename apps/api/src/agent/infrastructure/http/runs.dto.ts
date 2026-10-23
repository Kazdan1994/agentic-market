import { ApiProperty } from "@nestjs/swagger";
import { IsString, MaxLength } from "class-validator";
import type { FallbackReason, RunOutcome, RunStatus, SelectionStrategy } from "../../domain/agent-run";
import type { LogEntryView } from "../../application/get-run-log.handler";
import type { RunView } from "../../application/run-view";
import type { RunStep } from "../../domain/run-log-entry";

export class StartRunDto {
  // Length and content rules live in AgentRun.start, which answers 422 INVALID_REQUEST.
  @ApiProperty({ description: "Plain-language shopping request, 3–500 chars after trim" })
  @IsString()
  @MaxLength(2_000)
  request!: string;
}

export class RunResponse implements RunView {
  @ApiProperty({ format: "uuid" })
  id!: string;
  @ApiProperty({ format: "uuid" })
  mandateId!: string;
  @ApiProperty()
  request!: string;
  @ApiProperty({ enum: ["running", "completed"] })
  status!: RunStatus;
  @ApiProperty({
    enum: ["order_placed", "no_eligible_product", "refused_by_mandate", "payment_declined", "interrupted"],
    nullable: true,
    type: String,
  })
  outcome!: RunOutcome | null;
  @ApiProperty({ enum: ["ai", "rules"], nullable: true, type: String })
  strategy!: SelectionStrategy | null;
  @ApiProperty({
    enum: ["not_configured", "forced_rules", "unavailable", "timeout", "api_error", "unusable_answer", "ineligible_choice", "no_eligible_candidates"],
    nullable: true,
    type: String,
  })
  fallbackReason!: FallbackReason | null;
  @ApiProperty({ format: "uuid", nullable: true, type: String })
  orderId!: string | null;
  @ApiProperty({ format: "date-time" })
  startedAt!: string;
  @ApiProperty({ format: "date-time", nullable: true, type: String })
  endedAt!: string | null;
}

export class LogEntryResponse implements LogEntryView {
  @ApiProperty({ minimum: 1 })
  seq!: number;
  @ApiProperty({ format: "date-time" })
  at!: string;
  @ApiProperty({ enum: ["search", "evaluation", "selection", "mandate_check", "payment", "outcome"] })
  step!: RunStep;
  @ApiProperty()
  message!: string;
  @ApiProperty({ type: String, format: "uuid", nullable: true })
  productId!: string | null;
  @ApiProperty({ type: "object", additionalProperties: true })
  data!: Readonly<Record<string, unknown>>;
}
