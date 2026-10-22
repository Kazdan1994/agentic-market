import { Global, Module } from "@nestjs/common";
import { AUDIT_LOG } from "./audit/audit-log";
import { TypeOrmAuditLog } from "./audit/typeorm-audit-log";
import { APP_CONFIG, loadAppConfig } from "./config/app-config";
import { AI_STATUS } from "./domain/ai-status.port";
import { CLOCK } from "./domain/clock";
import { ID_GENERATOR } from "./domain/id-generator";
import { HealthController } from "./http/health.controller";
import { DisabledAiStatus } from "./infrastructure/disabled-ai-status";
import { SystemClock } from "./infrastructure/system-clock";
import { UuidV7Generator } from "./infrastructure/uuidv7-generator";

@Global()
@Module({
  controllers: [HealthController],
  providers: [
    { provide: APP_CONFIG, useFactory: () => loadAppConfig() },
    { provide: CLOCK, useClass: SystemClock },
    { provide: ID_GENERATOR, useClass: UuidV7Generator },
    { provide: AUDIT_LOG, useClass: TypeOrmAuditLog },
    { provide: AI_STATUS, useClass: DisabledAiStatus },
  ],
  exports: [APP_CONFIG, CLOCK, ID_GENERATOR, AUDIT_LOG, AI_STATUS],
})
export class SharedModule {}
