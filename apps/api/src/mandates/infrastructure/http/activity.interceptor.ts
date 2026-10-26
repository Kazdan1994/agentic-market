import { type CallHandler, type ExecutionContext, Inject, Injectable, type NestInterceptor } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PinoLogger } from "nestjs-pino";
import { catchError, from, mergeMap, type Observable, throwError } from "rxjs";
import { DomainError } from "../../../shared/errors/domain-error";
import {
  type ActivityAction,
  type ActivityResult,
  MANDATE_ACTIVITY_LOG,
  type MandateActivityLog,
} from "../../domain/mandate-activity-log";
import { MANDATE_ACTION } from "./mandate-action.decorator";
import type { RequestWithMandate } from "./mandate-key.guard";

const REFUSAL_PREFIXES = ["MANDATE_", "OVER_"];
const REFUSAL_CODES = new Set(["CATEGORY_NOT_ALLOWED", "OUT_OF_STOCK", "PRICE_CHANGED", "INVALID_REQUEST"]);

function resultOf(error: unknown): ActivityResult {
  if (!(error instanceof DomainError)) return "error";
  if (error.code === "PAYMENT_DECLINED") return "declined";
  if (REFUSAL_CODES.has(error.code) || REFUSAL_PREFIXES.some((p) => error.code.startsWith(p))) return "refused";
  return "error";
}

/**
 * Writes one activity row and one log line for each key-authenticated request that passed
 * the guard (FR-010e). Refusals by the guard itself are recorded by the guard.
 */
@Injectable()
export class ActivityInterceptor implements NestInterceptor {
  constructor(
    @Inject(MANDATE_ACTIVITY_LOG) private readonly activity: MandateActivityLog,
    private readonly reflector: Reflector,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext("MandateActivity");
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const auth = context.switchToHttp().getRequest<RequestWithMandate>().mandateAuth;
    const action = this.reflector.get<ActivityAction | undefined>(MANDATE_ACTION, context.getHandler());
    if (!auth || !action) return next.handle();

    const record = async (result: ActivityResult, detail: Record<string, unknown>) => {
      await this.activity.append({ mandateId: auth.mandateId, keyId: auth.keyId, action, result, detail });
      this.logger.info({ mandateId: auth.mandateId, keyId: auth.keyId, keyKind: auth.keyKind, action, result }, "mandate key request");
    };

    // Failures are recorded before the success mapping, so a failed success write is never
    // recorded a second time as an error.
    return next.handle().pipe(
      catchError((error: unknown) => {
        const code = error instanceof DomainError ? error.code : "INTERNAL_ERROR";
        return from(record(resultOf(error), { code })).pipe(mergeMap(() => throwError(() => error)));
      }),
      mergeMap((value) => from(record("ok", {}).then(() => value))),
    );
  }
}
