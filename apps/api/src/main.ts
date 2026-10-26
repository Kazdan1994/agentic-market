import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { configureApp } from "./configure-app";
import { APP_CONFIG, type AppConfig } from "./shared/config/app-config";
import { loadLocalEnv } from "./shared/config/load-env";

async function bootstrap(): Promise<void> {
  loadLocalEnv();
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.enableShutdownHooks();
  await configureApp(app);
  const config = app.get<AppConfig>(APP_CONFIG);
  await app.listen(config.API_PORT);
}

bootstrap().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
