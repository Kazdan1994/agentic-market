import { plainToInstance, Transform } from "class-transformer";
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
  MinLength,
  validateSync,
} from "class-validator";

export const APP_CONFIG = Symbol("AppConfig");

const toInt = ({ value }: { value: unknown }) =>
  value === undefined || value === "" ? undefined : Number(value);
const emptyToUndefined = ({ value }: { value: unknown }) => (value === "" ? undefined : value);

/** Typed configuration, validated once at boot. Missing secrets stop the process. */
export class AppConfig {
  @IsString()
  @MinLength(1)
  DATABASE_URL!: string;

  @Transform(toInt)
  @IsInt()
  @Min(1)
  @Max(65535)
  API_PORT = 3000;

  @IsUrl({ require_tld: false })
  API_INTERNAL_BASE_URL = "http://localhost:3000";

  @IsString()
  @MinLength(32)
  JWT_SECRET!: string;

  @IsString()
  @MinLength(32)
  BUILTIN_KEY_SECRET!: string;

  @IsString()
  @MinLength(1)
  SEED_DEMO_PASSWORD!: string;

  @Transform(emptyToUndefined)
  @IsOptional()
  @IsUrl({ require_tld: false })
  OLLAMA_BASE_URL?: string;

  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  AI_MODEL?: string;

  @IsIn(["auto", "rules"])
  AGENT_SELECTION_MODE: "auto" | "rules" = "auto";

  @Transform(toInt)
  @IsInt()
  @Min(1)
  AI_TIMEOUT_MS = 10_000;

  @Transform(toInt)
  @IsInt()
  @Min(0)
  @Max(99)
  SIMULATED_DECLINE_CENTS = 13;
}

export function loadAppConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const defined = Object.fromEntries(Object.entries(env).filter(([, v]) => v !== undefined));
  const config = plainToInstance(AppConfig, defined, { excludeExtraneousValues: false });
  const errors = validateSync(config, { whitelist: false });
  if (errors.length > 0) {
    const problems = errors.map((e) => `${e.property}: ${Object.values(e.constraints ?? {}).join(", ")}`);
    throw new Error(`Invalid configuration:\n  ${problems.join("\n  ")}`);
  }
  return config;
}
