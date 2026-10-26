import { type CanActivate, type ExecutionContext, Injectable } from "@nestjs/common";
import { UserAuthGuard } from "../../../identity/infrastructure/http/user-auth.guard";
import { MandateKeyGuard } from "./mandate-key.guard";

/** For routes open to users and agents alike: a key wins when present, otherwise a session. */
@Injectable()
export class UserOrKeyGuard implements CanActivate {
  constructor(
    private readonly userGuard: UserAuthGuard,
    private readonly keyGuard: MandateKeyGuard,
  ) {}

  canActivate(context: ExecutionContext): Promise<boolean> {
    const { authorization } = context.switchToHttp().getRequest<{ headers: { authorization?: string } }>().headers;
    return authorization ? this.keyGuard.canActivate(context) : this.userGuard.canActivate(context);
  }
}
