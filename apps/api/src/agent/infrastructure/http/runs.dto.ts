import { ApiProperty } from "@nestjs/swagger";
import { IsString, MaxLength } from "class-validator";
import type { FallbackReason, RunOutcome, RunStatus, SelectionStrategy } from "../../domain/agent-run";
import type { RunView } from "../../application/run-view";

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
    enum: ["not_configured", "forced_rules", "unavailable", "timeout", "api_error", "unusable_answer", "ineligible_choice"],
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
