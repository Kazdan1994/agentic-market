import { Controller, Get, Inject } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiProperty, ApiTags } from "@nestjs/swagger";
import { DataSource } from "typeorm";
import { AI_STATUS, type AiStatus, type AiStatusPort } from "../domain/ai-status.port";

class HealthResponse {
  @ApiProperty({ enum: ["ok"] })
  status!: "ok";

  @ApiProperty({ enum: ["up", "down"] })
  db!: "up" | "down";

  @ApiProperty({ enum: ["disabled", "cold", "warm", "unavailable"] })
  ai!: AiStatus;
}

/** Unauthenticated liveness check (constitution 1.1.0 exemption). No user or business data. */
@ApiTags("ops")
@Controller("health")
export class HealthController {
  constructor(
    private readonly dataSource: DataSource,
    @Inject(AI_STATUS) private readonly aiStatus: AiStatusPort,
  ) {}

  @Get()
  @ApiOperation({ operationId: "getHealth" })
  @ApiOkResponse({ type: HealthResponse })
  async getHealth(): Promise<HealthResponse> {
    const [db, ai] = await Promise.all([this.databaseStatus(), this.aiStatus.current()]);
    return { status: "ok", db, ai };
  }

  private async databaseStatus(): Promise<"up" | "down"> {
    try {
      await this.dataSource.query("SELECT 1");
      return "up";
    } catch {
      return "down";
    }
  }
}
