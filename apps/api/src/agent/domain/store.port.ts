import type { MandateStatus } from "../../mandates/domain/mandate-status";
import type { Candidate } from "./candidate";
import type { MandateLimits } from "./log-messages";

/** Who is calling the store, and for which run. Sent on every request. */
export interface StoreContext {
  key: string;
  runId: string;
  correlationId: string;
}

export interface StoreMandate extends MandateLimits {
  status: MandateStatus;
}

export interface CheckoutRequest {
  productId: string;
  expectedPriceMinor: number;
}

/** A failed store call. `code` is the API's error code, or STORE_UNAVAILABLE. */
export class StoreError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "StoreError";
  }
}

/**
 * The store as the built-in agent sees it: the same public endpoints and rights as any
 * third-party agent (FR-010a, research R8).
 */
export interface StorePort {
  getMandate(context: StoreContext): Promise<StoreMandate>;
  search(context: StoreContext, query: string, limit: number): Promise<Candidate[]>;
  getProduct(context: StoreContext, productId: string): Promise<Candidate>;
  checkout(context: StoreContext, request: CheckoutRequest): Promise<{ orderId: string }>;
}

export const STORE = Symbol("StorePort");
