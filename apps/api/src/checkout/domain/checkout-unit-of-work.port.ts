import type { ProductRecord } from "../../catalog/domain/product-repository";
import type { Mandate } from "../../mandates/domain/mandate";
import type { AuditEventInput } from "../../shared/audit/audit-log";
import type { OrderRecord } from "./order";
import type { PaymentRecord } from "./payment";

/** Operations available inside the checkout transaction. Locks are held until it ends. */
export interface CheckoutTx {
  lockMandate(mandateId: string): Promise<Mandate | null>;
  lockProduct(productId: string): Promise<ProductRecord | null>;
  findPayment(mandateId: string, idempotencyKey: string): Promise<PaymentRecord | null>;
  findOrderByPayment(paymentId: string): Promise<OrderRecord | null>;
  insertPayment(payment: PaymentRecord): Promise<void>;
  insertOrder(order: OrderRecord): Promise<void>;
  updateSpent(mandateId: string, spentMinor: number): Promise<void>;
  updateStock(productId: string, stock: number): Promise<void>;
  audit(event: AuditEventInput): Promise<void>;
}

/** Runs `work` in one database transaction; everything commits or nothing does (research R12). */
export interface CheckoutUnitOfWork {
  run<T>(work: (tx: CheckoutTx) => Promise<T>): Promise<T>;
}

export const CHECKOUT_UNIT_OF_WORK = Symbol("CheckoutUnitOfWork");
