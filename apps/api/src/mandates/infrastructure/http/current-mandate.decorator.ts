import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { MandateAuth, RequestWithMandate } from "./mandate-key.guard";

/** The mandate behind the caller's key. Only valid on routes protected by MandateKeyGuard. */
export const CurrentMandate = createParamDecorator((_data: unknown, context: ExecutionContext): MandateAuth => {
  const auth = context.switchToHttp().getRequest<RequestWithMandate>().mandateAuth;
  if (!auth) throw new Error("CurrentMandate used on a route without MandateKeyGuard");
  return auth;
});
