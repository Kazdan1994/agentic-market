import { ApiProperty } from "@nestjs/swagger";
import type { OrderView } from "../../application/order-view";

class OrderProductRef {
  @ApiProperty({ format: "uuid" })
  id!: string;
  @ApiProperty()
  name!: string;
}

class OrderMerchantRef {
  @ApiProperty({ format: "uuid" })
  id!: string;
  @ApiProperty()
  slug!: string;
  @ApiProperty()
  name!: string;
}

class OrderMoney {
  @ApiProperty({ minimum: 0 })
  amountMinor!: number;
  @ApiProperty({ pattern: "^[A-Z]{3}$" })
  currency!: string;
}

export class OrderResponse implements OrderView {
  @ApiProperty({ format: "uuid" })
  id!: string;
  @ApiProperty({ format: "uuid" })
  mandateId!: string;
  @ApiProperty({ format: "uuid", nullable: true, type: String })
  runId!: string | null;
  @ApiProperty({ type: OrderProductRef })
  product!: OrderProductRef;
  @ApiProperty({ type: OrderMerchantRef })
  merchant!: OrderMerchantRef;
  @ApiProperty({ type: OrderMoney })
  unitPrice!: OrderMoney;
  @ApiProperty({ enum: [1] })
  quantity!: 1;
  @ApiProperty({ type: OrderMoney })
  total!: OrderMoney;
  @ApiProperty({ enum: ["paid_simulated"] })
  status!: "paid_simulated";
  @ApiProperty({ format: "date-time" })
  placedAt!: string;
  @ApiProperty({ enum: ["builtin_agent", "third_party_agent"] })
  placedBy!: "builtin_agent" | "third_party_agent";
}
