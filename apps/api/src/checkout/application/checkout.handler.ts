import { Inject } from "@nestjs/common";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";
import type { MandateKeyKind } from "../../mandates/domain/mandate-key";
import { MandatePolicy, type RefusalCode } from "../../mandates/domain/mandate-policy";
import { CLOCK, type Clock } from "../../shared/domain/clock";
import { ID_GENERATOR, type IdGenerator } from "../../shared/domain/id-generator";
import { DomainError } from "../../shared/errors/domain-error";
import { ErrorCode } from "../../shared/errors/error-codes";
import { CHECKOUT_UNIT_OF_WORK, type CheckoutTx, type CheckoutUnitOfWork } from "../domain/checkout-unit-of-work.port";
import type { OrderRecord } from "../domain/order";
import { requestHashOf } from "../domain/payment";
import { PAYMENT_GATEWAY, type PaymentGatewayPort } from "../domain/payment-gateway.port";

export class CheckoutCommand {
  constructor(
    readonly mandateId: string,
    readonly keyId: string,
    readonly keyKind: MandateKeyKind,
    readonly productId: string,
    readonly expectedPriceMinor: number,
    readonly idempotencyKey: string,
    readonly runId: string | null = null,
  ) {}
}

export interface CheckoutLogger {
  info(obj: object, msg: string): void;
}

export const CHECKOUT_LOGGER = Symbol("CheckoutLogger");

type Outcome =
  | { kind: "order"; order: OrderRecord; amountMinor: number }
  | { kind: "declined"; amountMinor: number }
  | {
      kind: "refused";
      code: RefusalCode | "IDEMPOTENCY_KEY_REUSED" | "NOT_FOUND" | "VALIDATION_FAILED";
      amountMinor: number | null;
    };

const REFUSAL_MESSAGES: Record<string, string> = {
  NOT_FOUND: "Product not found.",
  VALIDATION_FAILED: "X-Agent-Run-Id does not match a running run of this mandate.",
  IDEMPOTENCY_KEY_REUSED: "This Idempotency-Key was already used for a different purchase.",
  MANDATE_REVOKED: "This mandate has been revoked.",
  MANDATE_EXPIRED: "This mandate has expired.",
  MANDATE_EXHAUSTED: "This mandate's budget is used up.",
  CATEGORY_NOT_ALLOWED: "This product's category is not allowed by the mandate.",
  OUT_OF_STOCK: "This product is out of stock.",
  PRICE_CHANGED: "The price changed since it was read.",
  OVER_PER_PURCHASE_CAP: "The price is above the mandate's per-purchase cap.",
  OVER_REMAINING_BUDGET: "The price is above the mandate's remaining budget.",
};

/**
 * Buys one unit of one product inside a mandate (FR-011 to FR-014). Every rule is checked
 * again under row locks; audit rows commit with the change they describe (FR-023).
 */
@CommandHandler(CheckoutCommand)
export class CheckoutHandler implements ICommandHandler<CheckoutCommand, OrderRecord> {
  private readonly policy = new MandatePolicy();

  constructor(
    @Inject(CHECKOUT_UNIT_OF_WORK) private readonly unitOfWork: CheckoutUnitOfWork,
    @Inject(PAYMENT_GATEWAY) private readonly gateway: PaymentGatewayPort,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(CHECKOUT_LOGGER) private readonly logger: CheckoutLogger,
  ) {}

  async execute(command: CheckoutCommand): Promise<OrderRecord> {
    const outcome = await this.unitOfWork.run((tx) => this.attempt(tx, command));
    this.logger.info(
      {
        mandateId: command.mandateId,
        keyId: command.keyId,
        keyKind: command.keyKind,
        runId: command.runId,
        productId: command.productId,
        amountMinor: outcome.amountMinor,
        outcome: outcome.kind === "order" ? "order_placed" : outcome.kind === "declined" ? "PAYMENT_DECLINED" : outcome.code,
      },
      "checkout attempt",
    );
    if (outcome.kind === "order") return outcome.order;
    if (outcome.kind === "declined") {
      throw new DomainError(ErrorCode.PAYMENT_DECLINED, "The payment was declined.");
    }
    throw new DomainError(ErrorCode[outcome.code], REFUSAL_MESSAGES[outcome.code] ?? "Checkout refused.", {
      code: outcome.code,
    });
  }

  private async attempt(tx: CheckoutTx, command: CheckoutCommand): Promise<Outcome> {
    const now = this.clock.now();
    const mandate = await tx.lockMandate(command.mandateId);
    if (!mandate) return { kind: "refused", code: "NOT_FOUND", amountMinor: null };

    const requestHash = requestHashOf(command.productId, command.expectedPriceMinor);
    const previous = await tx.findPayment(mandate.id, command.idempotencyKey);
    if (previous) {
      // Only the same key, with the same body, may replay a checkout.
      if (previous.keyId !== command.keyId || !previous.requestHash.equals(requestHash)) {
        return { kind: "refused", code: "IDEMPOTENCY_KEY_REUSED", amountMinor: null };
      }
      if (previous.outcome === "declined") return { kind: "declined", amountMinor: previous.amountMinor };
      const order = await tx.findOrderByPayment(previous.id);
      if (!order) throw new Error(`Approved payment ${previous.id} has no order`);
      return { kind: "order", order, amountMinor: previous.amountMinor };
    }

    if (command.runId !== null && !(await tx.isRunningRun(command.runId, mandate.id))) {
      return { kind: "refused", code: "VALIDATION_FAILED", amountMinor: null };
    }

    const record = await tx.lockProduct(command.productId);
    if (!record) return { kind: "refused", code: "NOT_FOUND", amountMinor: null };
    const { product, merchant } = record;
    const price = product.price;
    const audit = (type: Parameters<CheckoutTx["audit"]>[0]["type"], payload: Record<string, unknown>) =>
      tx.audit({
        type,
        actorType: "mandate_key",
        actorId: command.keyId,
        mandateId: mandate.id,
        payload: { productId: product.id, runId: command.runId, ...payload },
      });

    await audit("checkout.attempted", { expectedPriceMinor: command.expectedPriceMinor });
    const authorization = this.policy.authorize(mandate, product, command.expectedPriceMinor, now);
    if (!authorization.allowed) {
      await audit("mandate.check.refused", { code: authorization.code, priceMinor: price.amountMinor });
      return { kind: "refused", code: authorization.code, amountMinor: price.amountMinor };
    }
    await audit("mandate.check.allowed", { priceMinor: price.amountMinor });

    const charge = await this.gateway.charge(price);
    const paymentId = this.ids.next();
    await tx.insertPayment({
      id: paymentId,
      mandateId: mandate.id,
      keyId: command.keyId,
      idempotencyKey: command.idempotencyKey,
      requestHash,
      productId: product.id,
      amountMinor: price.amountMinor,
      currency: price.currency,
      outcome: charge.outcome,
      reference: charge.reference,
      createdAt: now,
    });
    if (charge.outcome === "declined") {
      await audit("payment.declined", { paymentId, amountMinor: price.amountMinor, reference: charge.reference });
      return { kind: "declined", amountMinor: price.amountMinor };
    }
    await audit("payment.approved", { paymentId, amountMinor: price.amountMinor, reference: charge.reference });

    const order: OrderRecord = {
      id: this.ids.next(),
      userId: mandate.userId,
      mandateId: mandate.id,
      merchantId: merchant.id,
      productId: product.id,
      runId: command.runId,
      keyId: command.keyId,
      paymentId,
      productName: product.name,
      merchantName: merchant.name,
      unitPrice: price,
      quantity: 1,
      total: price,
      status: "paid_simulated",
      placedAt: now,
    };
    await tx.insertOrder(order);
    await tx.updateSpent(mandate.id, mandate.recordSpend(price.amountMinor).spentMinor);
    await tx.updateStock(product.id, product.stock - 1);
    await audit("order.placed", { orderId: order.id, paymentId, totalMinor: price.amountMinor });
    return { kind: "order", order, amountMinor: price.amountMinor };
  }
}
