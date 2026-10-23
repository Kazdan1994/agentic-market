import type { Money } from "../../shared/domain/money";

export interface ChargeResult {
  outcome: "approved" | "declined";
  reference: string;
}

export interface PaymentGatewayPort {
  charge(amount: Money): Promise<ChargeResult>;
}

export const PAYMENT_GATEWAY = Symbol("PaymentGatewayPort");
