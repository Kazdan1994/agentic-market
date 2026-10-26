import { Body, Controller, Get, HttpCode, Post, Res, UseGuards } from "@nestjs/common";
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import { ApiCookieAuth, ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiProperty, ApiTags } from "@nestjs/swagger";
import { IsEmail, IsString, MinLength } from "class-validator";
import type { Response } from "express";
import { LoginCommand } from "../../application/login.handler";
import { GetMeQuery, type MeView } from "../../application/get-me.handler";
import { CurrentUser } from "./current-user.decorator";
import { SESSION_COOKIE, SESSION_TTL_SECONDS, SessionService } from "./session.service";
import { type AuthenticatedUser, UserAuthGuard } from "./user-auth.guard";

class LoginBody {
  @ApiProperty({ format: "email" })
  @IsEmail()
  email!: string;

  @ApiProperty({ minLength: 1 })
  @IsString()
  @MinLength(1)
  password!: string;
}

class MeResponse implements MeView {
  @ApiProperty({ format: "uuid" })
  id!: string;
  @ApiProperty()
  email!: string;
  @ApiProperty()
  displayName!: string;
}

const COOKIE_OPTIONS = { httpOnly: true, sameSite: "lax", path: "/" } as const;

@ApiTags("auth")
@Controller("v1")
export class AuthController {
  constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
    private readonly sessions: SessionService,
  ) {}

  @Post("auth/login")
  @HttpCode(204)
  @ApiOperation({ operationId: "login" })
  @ApiNoContentResponse({ description: "Session cookie set" })
  async login(@Body() body: LoginBody, @Res({ passthrough: true }) res: Response): Promise<void> {
    const { userId } = await this.commands.execute<LoginCommand, { userId: string }>(
      new LoginCommand(body.email, body.password),
    );
    const token = await this.sessions.issue(userId);
    res.cookie(SESSION_COOKIE, token, { ...COOKIE_OPTIONS, maxAge: SESSION_TTL_SECONDS * 1000 });
  }

  @Post("auth/logout")
  @HttpCode(204)
  @UseGuards(UserAuthGuard)
  @ApiCookieAuth()
  @ApiOperation({ operationId: "logout" })
  @ApiNoContentResponse({ description: "Session cookie cleared" })
  logout(@Res({ passthrough: true }) res: Response): void {
    res.clearCookie(SESSION_COOKIE, COOKIE_OPTIONS);
  }

  @Get("me")
  @UseGuards(UserAuthGuard)
  @ApiCookieAuth()
  @ApiOperation({ operationId: "getMe" })
  @ApiOkResponse({ type: MeResponse })
  getMe(@CurrentUser() user: AuthenticatedUser): Promise<MeView> {
    return this.queries.execute<GetMeQuery, MeView>(new GetMeQuery(user.userId));
  }
}
