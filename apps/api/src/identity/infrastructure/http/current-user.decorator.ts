import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { AuthenticatedUser, RequestWithUser } from "./user-auth.guard";

/** The signed-in user. Only valid on routes protected by UserAuthGuard. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser => {
    const user = context.switchToHttp().getRequest<RequestWithUser>().user;
    if (!user) throw new Error("CurrentUser used on a route without UserAuthGuard");
    return user;
  },
);
