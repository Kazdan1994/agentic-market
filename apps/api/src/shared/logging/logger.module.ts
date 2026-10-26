import { Module } from "@nestjs/common";
import { LoggerModule as PinoLoggerModule } from "nestjs-pino";
import { CorrelationContext } from "../correlation/correlation-context";
import { buildPinoOptions } from "./logger.options";

@Module({
  imports: [
    // Factory, not static options: LOG_LEVEL is read at startup, after the env is loaded.
    PinoLoggerModule.forRootAsync({
      useFactory: () => ({
        pinoHttp: {
          ...buildPinoOptions(process.env.LOG_LEVEL ?? "info"),
          genReqId: (req) => CorrelationContext.current() ?? String(req.id),
          quietReqLogger: true,
        },
      }),
    }),
  ],
})
export class LoggerModule {}
