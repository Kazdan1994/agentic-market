import type { Candidate } from "../../src/agent/domain/candidate";
import type { CheckoutRequest, StoreContext, StoreMandate } from "../../src/agent/domain/store.port";
import { StoreError, type StorePort } from "../../src/agent/domain/store.port";
import { eligibilityOf } from "../../src/catalog/domain/eligibility";
import type { Mandate } from "../../src/mandates/domain/mandate";
import { MandatePolicy } from "../../src/mandates/domain/mandate-policy";
import { Money } from "../../src/shared/domain/money";

export interface StoreProduct {
  candidate: Omit<Candidate, "eligibility">;
  categoryId: string;
  stock: number;
}

/**
 * A StorePort for handler tests. It applies the same MandatePolicy as the real checkout,
 * so outcomes match the API. `failNextCheckout` forces a code such as PAYMENT_DECLINED.
 */
export class InMemoryStore implements StorePort {
  readonly calls: { method: string; context: StoreContext }[] = [];
  readonly orders: { orderId: string; productId: string; priceMinor: number }[] = [];
  failNextCheckout: string | null = null;
  throwOnSearch: Error | null = null;
  private readonly policy = new MandatePolicy();
  private readonly ordersByRun = new Map<string, string>();

  constructor(
    private mandate: Mandate,
    private readonly products: StoreProduct[],
    private readonly now: () => Date = () => new Date(),
  ) {}

  async getMandate(context: StoreContext): Promise<StoreMandate> {
    this.calls.push({ method: "getMandate", context });
    return {
      status: this.mandate.status(this.now()),
      perPurchaseCapMinor: this.mandate.perPurchaseCapMinor,
      remainingMinor: this.mandate.remainingMinor,
      currency: this.mandate.currency,
    };
  }

  async search(context: StoreContext): Promise<Candidate[]> {
    this.calls.push({ method: "search", context });
    if (this.throwOnSearch) throw this.throwOnSearch;
    return this.products.map((p) => ({
      ...p.candidate,
      eligibility: eligibilityOf(this.mandate, { categoryId: p.categoryId, priceMinor: p.candidate.priceMinor, stock: p.stock }),
    }));
  }

  async getProduct(context: StoreContext, productId: string): Promise<Candidate> {
    this.calls.push({ method: "getProduct", context });
    const found = (await this.search(context)).find((c) => c.productId === productId);
    if (!found) throw new StoreError("NOT_FOUND", "Product not found.");
    return found;
  }

  async checkout(context: StoreContext, request: CheckoutRequest): Promise<{ orderId: string }> {
    this.calls.push({ method: "checkout", context });
    // Same idempotency as the API: the run id is the key, so a retry returns the first order.
    const previous = this.ordersByRun.get(context.runId);
    if (previous) return { orderId: previous };
    if (this.failNextCheckout) {
      const code = this.failNextCheckout;
      this.failNextCheckout = null;
      throw new StoreError(code, code);
    }
    const product = this.products.find((p) => p.candidate.productId === request.productId);
    if (!product) throw new StoreError("NOT_FOUND", "Product not found.");
    const decision = this.policy.authorize(
      this.mandate,
      {
        categoryId: product.categoryId,
        price: Money.of(product.candidate.priceMinor, product.candidate.currency),
        isInStock: () => product.stock > 0,
      },
      request.expectedPriceMinor,
      this.now(),
    );
    if (!decision.allowed) throw new StoreError(decision.code, decision.code);
    this.mandate = this.mandate.recordSpend(product.candidate.priceMinor);
    product.stock -= 1;
    const orderId = `00000000-0000-7000-8000-${String(this.orders.length + 1).padStart(12, "0")}`;
    this.orders.push({ orderId, productId: product.candidate.productId, priceMinor: product.candidate.priceMinor });
    this.ordersByRun.set(context.runId, orderId);
    return { orderId };
  }
}
