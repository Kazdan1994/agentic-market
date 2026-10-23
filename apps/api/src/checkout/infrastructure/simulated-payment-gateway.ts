import { randomBytes } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
import { APP_CONFIG, type AppConfig } from "../../shared/config/app-config";
import type { Money } from "../../shared/domain/money";
import type { ChargeResult, PaymentGatewayPort } from "../domain/payment-gateway.port";

/** Deterministic demo gateway: prices ending in the configured cents are declined (research R13). */
@Injectable()
export class SimulatedPaymentGateway implements PaymentGatewayPort {
  constructor(@Inject(APP_CONFIG) private readonly config: Pick<AppConfig, "SIMULATED_DECLINE_CENTS">) {}

  async charge(amount: Money): Promise<ChargeResult> {
    const outcome = amount.amountMinor % 100 === this.config.SIMULATED_DECLINE_CENTS ? "declined" : "approved";
    return { outcome, reference: `sim_${randomBytes(12).toString("base64url")}` };
  }
}
