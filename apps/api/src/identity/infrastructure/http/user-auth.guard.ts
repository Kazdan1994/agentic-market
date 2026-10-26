import { type CanActivate, type ExecutionContext, Injectable } from "@nestjs/common";
import type { Request } from "express";
import { DomainError } from "../../../shared/errors/domain-error";
import { ErrorCode } from "../../../shared/errors/error-codes";
import { SESSION_COOKIE, SessionService } from "./session.service";

export interface AuthenticatedUser {
  userId: string;
}

export type RequestWithUser = Request & { user?: AuthenticatedUser };

@Injectable()
export class UserAuthGuard implements CanActivate {
  constructor(private readonly sessions: SessionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const cookies = request.cookies as Record<string, string | undefined> | undefined;
    const userId = await this.sessions.verify(cookies?.[SESSION_COOKIE]);
    if (!userId) throw new DomainError(ErrorCode.UNAUTHORIZED, "Please sign in.");
    request.user = { userId };
    return true;
  }
}
