import { type CanActivate, type ExecutionContext, Inject, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import { AUDIT_LOG, type AuditLog } from "../../../shared/audit/audit-log";
import { CLOCK, type Clock } from "../../../shared/domain/clock";
import { DomainError } from "../../../shared/errors/domain-error";
import { ErrorCode } from "../../../shared/errors/error-codes";
import { MANDATE_ACTIVITY_LOG, type ActivityAction, type MandateActivityLog } from "../../domain/mandate-activity-log";
import { KEY_PREFIX, type MandateKeyKind, MandateKeySecrets } from "../../domain/mandate-key";
import { MANDATE_REPOSITORY, type MandateRepository } from "../../domain/mandate-repository";
import { MANDATE_ACTION } from "./mandate-action.decorator";

export interface MandateAuth {
  mandateId: string;
  keyId: string;
  keyKind: MandateKeyKind;
}

export type RequestWithMandate = Request & { mandateAuth?: MandateAuth };

const STATUS_CODES = {
  revoked: ErrorCode.MANDATE_REVOKED,
  expired: ErrorCode.MANDATE_EXPIRED,
  exhausted: ErrorCode.MANDATE_EXHAUSTED,
} as const;

const STATUS_MESSAGES = {
  revoked: "This mandate has been revoked.",
  expired: "This mandate has expired.",
  exhausted: "This mandate's budget is used up.",
} as const;

// Missing, unknown and revoked keys get the same answer, so keys cannot be probed.
const invalidKey = () => new DomainError(ErrorCode.UNAUTHORIZED, "Invalid or missing access key.");

/** Authenticates `Authorization: Bearer amk_...` and refuses keys of inactive mandates (FR-010d). */
@Injectable()
export class MandateKeyGuard implements CanActivate {
  constructor(
    @Inject(MANDATE_REPOSITORY) private readonly mandates: MandateRepository,
    @Inject(MANDATE_ACTIVITY_LOG) private readonly activity: MandateActivityLog,
    @Inject(AUDIT_LOG) private readonly auditLog: AuditLog,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithMandate>();
    const secret = /^Bearer (\S+)$/.exec(request.headers.authorization ?? "")?.[1];
    if (!secret?.startsWith(KEY_PREFIX)) throw invalidKey();

    const found = await this.mandates.findByKeyHash(MandateKeySecrets.hash(secret));
    if (!found || found.key.isRevoked()) throw invalidKey();

    const { mandate, key } = found;
    const status = mandate.status(this.clock.now());
    if (status !== "active") {
      const code = STATUS_CODES[status];
      const action = this.reflector.get<ActivityAction | undefined>(MANDATE_ACTION, context.getHandler());
      if (action) {
        await this.activity.append({ mandateId: mandate.id, keyId: key.id, action, result: "refused", detail: { code } });
      }
      await this.auditLog.append({
        type: "mandate.check.refused",
        actorType: "mandate_key",
        actorId: key.id,
        mandateId: mandate.id,
        payload: { code, action: action ?? null },
      });
      throw new DomainError(code, STATUS_MESSAGES[status], { status });
    }

    request.mandateAuth = { mandateId: mandate.id, keyId: key.id, keyKind: key.kind };
    return true;
  }
}
