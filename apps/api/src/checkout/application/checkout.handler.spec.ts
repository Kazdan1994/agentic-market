import { beforeEach, describe, expect, it } from "vitest";
import { Product } from "../../catalog/domain/product";
import type { ProductRecord } from "../../catalog/domain/product-repository";
import { Mandate } from "../../mandates/domain/mandate";
import type { AuditEventInput } from "../../shared/audit/audit-log";
import { Money } from "../../shared/domain/money";
import { DomainError } from "../../shared/errors/domain-error";
import { FixedClock } from "../../../test/support/fixed-clock";
import { SequentialIds } from "../../../test/support/sequential-ids";
import type { CheckoutTx, CheckoutUnitOfWork } from "../domain/checkout-unit-of-work.port";
import type { OrderRecord } from "../domain/order";
import type { PaymentRecord } from "../domain/payment";
import type { PaymentGatewayPort } from "../domain/payment-gateway.port";
import { CheckoutCommand, CheckoutHandler } from "./checkout.handler";

const NOW = new Date("2026-10-23T12:00:00Z");
const AUDIO = "00000000-0000-7000-8000-0000000000c1";
const MANDATE_ID = "00000000-0000-7000-8000-0000000000b1";
const KEY_ID = "00000000-0000-7000-8000-0000000000d1";
const PRODUCT_ID = "00000000-0000-7000-8000-0000000000e1";

class InMemoryCheckout implements CheckoutUnitOfWork {
  mandate = Mandate.restore({
    id: MANDATE_ID,
    agentId: "00000000-0000-7000-8000-0000000000a1",
    userId: "01900000-0000-7000-8000-00000000a11c",
    perPurchaseCapMinor: 10_000,
    totalBudgetMinor: 15_000,
    spentMinor: 0,
    currency: "EUR",
    categoryIds: [AUDIO],
    expiresAt: new Date("2026-10-24T12:00:00Z"),
    revokedAt: null,
    createdAt: NOW,
  });
  stock = 3;
  priceMinor = 7_900;
  payments: PaymentRecord[] = [];
  orders: OrderRecord[] = [];
  audit: AuditEventInput[] = [];

  async run<T>(work: (tx: CheckoutTx) => Promise<T>): Promise<T> {
    const tx: CheckoutTx = {
      lockMandate: async () => this.mandate,
      lockProduct: async (): Promise<ProductRecord> => ({
        product: Product.create({
          id: PRODUCT_ID,
          merchantId: "00000000-0000-7000-8000-0000000000f1",
          categoryId: AUDIO,
          itemRef: "audio-runbuds-pro",
          name: "RunBuds Pro",
          description: "",
          priceMinor: this.priceMinor,
          currency: "EUR",
          stock: this.stock,
          listedAt: NOW,
        }),
        merchant: { id: "00000000-0000-7000-8000-0000000000f1", slug: "techcorner", name: "TechCorner" },
        category: { id: AUDIO, slug: "audio", name: "Audio" },
      }),
      isRunningRun: async () => true,
      findPayment: async (_m, key) => this.payments.find((p) => p.idempotencyKey === key) ?? null,
      findOrderByPayment: async (paymentId) => this.orders.find((o) => o.paymentId === paymentId) ?? null,
      insertPayment: async (payment) => void this.payments.push(payment),
      insertOrder: async (order) => void this.orders.push(order),
      updateSpent: async (_id, spentMinor) => {
        this.mandate = Mandate.restore({ ...this.mandateProps(), spentMinor });
      },
      updateStock: async (_id, stock) => {
        this.stock = stock;
      },
      audit: async (event) => void this.audit.push(event),
    };
    return work(tx);
  }

  private mandateProps() {
    const m = this.mandate;
    return {
      id: m.id,
      agentId: m.agentId,
      userId: m.userId,
      perPurchaseCapMinor: m.perPurchaseCapMinor,
      totalBudgetMinor: m.totalBudgetMinor,
      spentMinor: m.spentMinor,
      currency: m.currency,
      categoryIds: m.categoryIds,
      expiresAt: m.expiresAt,
      revokedAt: m.revokedAt,
      createdAt: m.createdAt,
    };
  }
}

const approve: PaymentGatewayPort = { charge: async () => ({ outcome: "approved", reference: "sim_approved" }) };
const decline: PaymentGatewayPort = { charge: async () => ({ outcome: "declined", reference: "sim_declined" }) };

let store: InMemoryCheckout;
let logs: { obj: Record<string, unknown>; msg: string }[];

function handler(gateway: PaymentGatewayPort = approve) {
  const logger = { info: (obj: object, msg: string) => void logs.push({ obj: obj as Record<string, unknown>, msg }) };
  return new CheckoutHandler(store, gateway, new FixedClock(NOW), new SequentialIds(), logger);
}

const command = (over: Partial<CheckoutCommand> = {}) =>
  Object.assign(
    new CheckoutCommand(MANDATE_ID, KEY_ID, "builtin", PRODUCT_ID, 7_900, "idem-key-0001", "00000000-0000-7000-8000-0000000000aa"),
    over,
  );

async function failure(promise: Promise<unknown>): Promise<DomainError> {
  const error = await promise.catch((e: unknown) => e);
  if (!(error instanceof DomainError)) throw new Error(`expected DomainError, got ${String(error)}`);
  return error;
}

describe("CheckoutHandler", () => {
  beforeEach(() => {
    store = new InMemoryCheckout();
    logs = [];
  });

  it("places one order, spends budget, takes stock and audits every step", async () => {
    const order = await handler().execute(command());

    expect(store.orders).toHaveLength(1);
    expect(order).toMatchObject({
      productId: PRODUCT_ID,
      productName: "RunBuds Pro",
      merchantName: "TechCorner",
      quantity: 1,
      unitPrice: Money.of(7_900, "EUR"),
      total: Money.of(7_900, "EUR"),
      status: "paid_simulated",
      runId: "00000000-0000-7000-8000-0000000000aa",
    });
    expect(store.mandate.spentMinor).toBe(7_900);
    expect(store.stock).toBe(2);
    expect(store.audit.map((e) => e.type)).toEqual([
      "checkout.attempted",
      "mandate.check.allowed",
      "payment.approved",
      "order.placed",
    ]);
  });

  it("declines without an order, budget or stock change", async () => {
    const error = await failure(handler(decline).execute(command()));
    expect(error.code).toBe("PAYMENT_DECLINED");
    expect(store.orders).toHaveLength(0);
    expect(store.mandate.spentMinor).toBe(0);
    expect(store.stock).toBe(3);
    expect(store.audit.map((e) => e.type)).toContain("payment.declined");
  });

  it("refuses with the policy code and audits the refusal", async () => {
    const error = await failure(handler().execute(command({ expectedPriceMinor: 7_000 })));
    expect(error.code).toBe("PRICE_CHANGED");
    expect(store.payments).toHaveLength(0);
    expect(store.audit.find((e) => e.type === "mandate.check.refused")?.payload).toMatchObject({ code: "PRICE_CHANGED" });
  });

  it("replays the same idempotency key and body as the same order", async () => {
    const first = await handler().execute(command());
    const second = await handler().execute(command());
    expect(second.id).toBe(first.id);
    expect(store.payments).toHaveLength(1);
    expect(store.orders).toHaveLength(1);
    expect(store.mandate.spentMinor).toBe(7_900);
  });

  it("refuses the same idempotency key with a different body", async () => {
    await handler().execute(command());
    store.priceMinor = 7_800;
    const error = await failure(handler().execute(command({ expectedPriceMinor: 7_800 })));
    expect(error.code).toBe("IDEMPOTENCY_KEY_REUSED");
  });

  it("refuses a replay of the idempotency key by another key", async () => {
    await handler().execute(command());
    const error = await failure(handler().execute(command({ keyId: "00000000-0000-7000-8000-0000000000d2" })));
    expect(error.code).toBe("IDEMPOTENCY_KEY_REUSED");
  });

  it("logs one structured line per attempt", async () => {
    await handler().execute(command());
    await failure(handler().execute(command({ idempotencyKey: "idem-key-0002", expectedPriceMinor: 1 })));
    expect(logs).toHaveLength(2);
    expect(logs[0]?.obj).toMatchObject({
      mandateId: MANDATE_ID,
      keyId: KEY_ID,
      keyKind: "builtin",
      runId: "00000000-0000-7000-8000-0000000000aa",
      productId: PRODUCT_ID,
      amountMinor: 7_900,
      outcome: "order_placed",
    });
    expect(logs[1]?.obj).toMatchObject({ outcome: "PRICE_CHANGED" });
  });
});
