import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsUUID, Max, Min } from "class-validator";

export class CheckoutDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  productId!: string;

  @ApiProperty({ minimum: 1, description: "Price the agent saw; a different current price yields PRICE_CHANGED." })
  @IsInt()
  @Min(1)
  @Max(2_147_483_647)
  expectedPriceMinor!: number;
}
