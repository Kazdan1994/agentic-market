import { Module } from "@nestjs/common";
import { CqrsModule } from "@nestjs/cqrs";
import { TypeOrmModule } from "@nestjs/typeorm";
import { entities } from "./database/entities";
import { AgentModule } from "./agent/agent.module";
import { CatalogModule } from "./catalog/catalog.module";
import { CheckoutModule } from "./checkout/checkout.module";
import { migrations } from "./database/migrations";
import { IdentityModule } from "./identity/identity.module";
import { MandatesModule } from "./mandates/mandates.module";
import { APP_CONFIG, type AppConfig } from "./shared/config/app-config";
import { LoggerModule } from "./shared/logging/logger.module";
import { SharedModule } from "./shared/shared.module";

@Module({
  imports: [
    LoggerModule,
    CqrsModule.forRoot(),
    SharedModule,
    TypeOrmModule.forRootAsync({
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) => ({
        type: "postgres",
        url: config.DATABASE_URL,
        entities,
        migrations,
        synchronize: false,
        // The OpenAPI export builds the app without a database.
        manualInitialization: process.env.OPENAPI_EXPORT === "1",
      }),
    }),
    IdentityModule,
    CatalogModule,
    MandatesModule,
    CheckoutModule,
    AgentModule,
  ],
})
export class AppModule {}
