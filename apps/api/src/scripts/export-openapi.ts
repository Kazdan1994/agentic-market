import "reflect-metadata";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "../app.module";
import { configureApp } from "../configure-app";

/** Writes apps/api/openapi.json without a database or real secrets (research R9). */
async function main(): Promise<void> {
  const placeholder = "openapi-export-placeholder-value-not-a-secret";
  process.env.OPENAPI_EXPORT = "1";
  process.env.LOG_LEVEL = "silent";
  process.env.DATABASE_URL ??= "postgres://export:export@localhost:5432/export";
  process.env.JWT_SECRET ??= placeholder;
  process.env.BUILTIN_KEY_SECRET ??= placeholder;
  process.env.SEED_DEMO_PASSWORD ??= placeholder;

  const app = await NestFactory.create(AppModule, { logger: false });
  const document = await configureApp(app);
  const target = path.resolve(process.cwd(), "openapi.json");
  writeFileSync(target, `${JSON.stringify(document, null, 2)}\n`);
  console.log(`Wrote ${target}`);
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
