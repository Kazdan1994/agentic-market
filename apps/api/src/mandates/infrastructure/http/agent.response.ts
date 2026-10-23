import { ApiProperty } from "@nestjs/swagger";
import type { AgentView, MandateView, MoneyView } from "../../application/mandate-view";
import type { MandateStatus } from "../../domain/mandate-status";

// OpenAPI shapes for the `Agent` and `Mandate` schemas in contracts/openapi.yaml.

export class MoneyResponse implements MoneyView {
  @ApiProperty({ minimum: 0 })
  amountMinor!: number;
  @ApiProperty({ pattern: "^[A-Z]{3}$" })
  currency!: string;
}

export class MandateCategoryResponse {
  @ApiProperty()
  slug!: string;
  @ApiProperty()
  name!: string;
}

export class MandateResponse implements MandateView {
  @ApiProperty({ format: "uuid" })
  id!: string;
  @ApiProperty({ enum: ["active", "exhausted", "expired", "revoked"] })
  status!: MandateStatus;
  @ApiProperty({ type: MoneyResponse })
  perPurchaseCap!: MoneyResponse;
  @ApiProperty({ type: MoneyResponse })
  totalBudget!: MoneyResponse;
  @ApiProperty({ type: MoneyResponse })
  spent!: MoneyResponse;
  @ApiProperty({ type: MoneyResponse })
  remaining!: MoneyResponse;
  @ApiProperty({ type: [MandateCategoryResponse], minItems: 1 })
  categories!: MandateCategoryResponse[];
  @ApiProperty({ format: "date-time" })
  expiresAt!: string;
  @ApiProperty({ format: "date-time", nullable: true, type: String })
  revokedAt!: string | null;
  @ApiProperty({ format: "date-time" })
  createdAt!: string;
}

export class AgentResponse implements AgentView {
  @ApiProperty({ format: "uuid" })
  id!: string;
  @ApiProperty()
  name!: string;
  @ApiProperty({ type: MandateResponse })
  mandate!: MandateResponse;
  @ApiProperty({ format: "date-time" })
  createdAt!: string;
}
