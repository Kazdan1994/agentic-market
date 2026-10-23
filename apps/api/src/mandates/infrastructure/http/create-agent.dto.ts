import { ApiProperty } from "@nestjs/swagger";
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsInt,
  IsISO8601,
  IsString,
  Length,
  Matches,
  Max,
  Min,
} from "class-validator";

// Amount columns are Postgres `integer`.
const MAX_MINOR = 2_147_483_647;

export class CreateAgentDto {
  @ApiProperty({ minLength: 1, maxLength: 60 })
  @IsString()
  @Length(1, 60)
  name!: string;

  @ApiProperty({ minimum: 1, maximum: MAX_MINOR })
  @IsInt()
  @Min(1)
  @Max(MAX_MINOR)
  perPurchaseCapMinor!: number;

  @ApiProperty({ minimum: 1, maximum: MAX_MINOR })
  @IsInt()
  @Min(1)
  @Max(MAX_MINOR)
  totalBudgetMinor!: number;

  @ApiProperty({ type: [String], minItems: 1, uniqueItems: true })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsString({ each: true })
  categorySlugs!: string[];

  @ApiProperty({ format: "date-time" })
  @IsISO8601({ strict: true })
  @Matches(/T\d{2}:\d{2}.*(Z|[+-]\d{2}:\d{2})$/, { message: "expiresAt must be a date-time with a time zone" })
  expiresAt!: string;
}
