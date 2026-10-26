import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, IsNotEmpty, IsOptional, IsString, Length, Max, Min } from "class-validator";
import type { ProductView, SearchResultView } from "../../application/product-view";

export class SearchCatalogParams {
  @ApiProperty({ minLength: 1, maxLength: 200 })
  @IsString()
  @Length(1, 200)
  q!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  category?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 50, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 20;
}

class NamedRef {
  @ApiProperty()
  slug!: string;
  @ApiProperty()
  name!: string;
}

class MerchantRefResponse extends NamedRef {
  @ApiProperty({ format: "uuid" })
  id!: string;
}

class PriceResponse {
  @ApiProperty({ minimum: 0 })
  amountMinor!: number;
  @ApiProperty({ pattern: "^[A-Z]{3}$" })
  currency!: string;
}

class EligibilityResponse {
  @ApiProperty()
  eligible!: boolean;
  @ApiProperty({ enum: ["over_budget", "category_not_allowed", "out_of_stock"], nullable: true, type: String })
  reasonCode!: "over_budget" | "category_not_allowed" | "out_of_stock" | null;
}

export class ProductResponse implements ProductView {
  @ApiProperty({ format: "uuid" })
  id!: string;
  @ApiProperty()
  itemRef!: string;
  @ApiProperty()
  name!: string;
  @ApiProperty()
  description!: string;
  @ApiProperty({ type: NamedRef })
  category!: NamedRef;
  @ApiProperty({ type: MerchantRefResponse })
  merchant!: MerchantRefResponse;
  @ApiProperty({ type: PriceResponse })
  price!: PriceResponse;
  @ApiProperty({ minimum: 0 })
  stock!: number;
  @ApiProperty({ format: "date-time" })
  listedAt!: string;
}

export class SearchResultResponse extends ProductResponse implements SearchResultView {
  @ApiProperty({ type: EligibilityResponse })
  eligibility!: EligibilityResponse;
}
