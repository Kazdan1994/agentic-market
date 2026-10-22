import { Module } from "@nestjs/common";
import { CqrsModule } from "@nestjs/cqrs";
import { LoggerModule } from "./shared/logging/logger.module";
import { SharedModule } from "./shared/shared.module";

@Module({
  imports: [LoggerModule, CqrsModule.forRoot(), SharedModule],
})
export class AppModule {}
