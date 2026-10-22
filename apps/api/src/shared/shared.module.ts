import { Global, Module } from "@nestjs/common";
import { APP_CONFIG, loadAppConfig } from "./config/app-config";
import { AI_STATUS } from "./domain/ai-status.port";
import { CLOCK } from "./domain/clock";
import { ID_GENERATOR } from "./domain/id-generator";
import { DisabledAiStatus } from "./infrastructure/disabled-ai-status";
import { SystemClock } from "./infrastructure/system-clock";
import { UuidV7Generator } from "./infrastructure/uuidv7-generator";

@Global()
@Module({
  providers: [
    { provide: APP_CONFIG, useFactory: () => loadAppConfig() },
    { provide: CLOCK, useClass: SystemClock },
    { provide: ID_GENERATOR, useClass: UuidV7Generator },
    { provide: AI_STATUS, useClass: DisabledAiStatus },
  ],
  exports: [APP_CONFIG, CLOCK, ID_GENERATOR, AI_STATUS],
})
export class SharedModule {}
