import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { APP_CONFIG, type AppConfig } from "../shared/config/app-config";
import { GetMeHandler } from "./application/get-me.handler";
import { LoginHandler } from "./application/login.handler";
import { PASSWORD_HASHER } from "./domain/password-hasher";
import { USER_REPOSITORY } from "./domain/user-repository";
import { Argon2PasswordHasher } from "./infrastructure/argon2-password-hasher";
import { AuthController } from "./infrastructure/http/auth.controller";
import { SessionService } from "./infrastructure/http/session.service";
import { UserAuthGuard } from "./infrastructure/http/user-auth.guard";
import { TypeOrmUserRepository } from "./infrastructure/typeorm-user-repository";

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) => ({ secret: config.JWT_SECRET }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    LoginHandler,
    GetMeHandler,
    SessionService,
    UserAuthGuard,
    { provide: USER_REPOSITORY, useClass: TypeOrmUserRepository },
    { provide: PASSWORD_HASHER, useClass: Argon2PasswordHasher },
  ],
  exports: [SessionService, UserAuthGuard],
})
export class IdentityModule {}
