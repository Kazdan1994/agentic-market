import { Inject, Injectable, Optional } from "@nestjs/common";
import { isUUID } from "class-validator";
import { APP_CONFIG, type AppConfig } from "../../shared/config/app-config";
import type { Candidate } from "../domain/candidate";
import { type CheckoutRequest, type StoreContext, type StoreMandate, StoreError, type StorePort } from "../domain/store.port";

interface ApiProduct {
  id: string;
  itemRef: string;
  name: string;
  description: string;
  category: { name: string };
  merchant: { name: string };
  price: { amountMinor: number; currency: string };
  listedAt: string;
  eligibility?: Candidate["eligibility"];
}

interface ApiMandate {
  status: StoreMandate["status"];
  perPurchaseCap: { amountMinor: number; currency: string };
  remaining: { amountMinor: number; currency: string };
}

// A run holds its mandate's "one run at a time" slot, so a store call must never hang.
export const STORE_CALL_TIMEOUT_MS = 10_000;
export const STORE_CALL_TIMEOUT = Symbol("StoreCallTimeoutMs");

const toCandidate = (p: ApiProduct): Candidate => ({
  productId: p.id,
  itemRef: p.itemRef,
  name: p.name,
  description: p.description,
  categoryName: p.category.name,
  merchantName: p.merchant.name,
  priceMinor: p.price.amountMinor,
  currency: p.price.currency,
  listedAt: new Date(p.listedAt),
  eligibility: p.eligibility ?? { eligible: true, reasonCode: null },
});

/** Calls the API's own public endpoints over loopback, like any outside agent (R8). */
@Injectable()
export class HttpStoreAdapter implements StorePort {
  constructor(
    @Inject(APP_CONFIG) private readonly config: Pick<AppConfig, "API_INTERNAL_BASE_URL">,
    @Optional() @Inject(STORE_CALL_TIMEOUT) private readonly timeoutMs: number = STORE_CALL_TIMEOUT_MS,
  ) {}

  async getMandate(context: StoreContext): Promise<StoreMandate> {
    const m = await this.call<ApiMandate>(context, "GET", "/v1/mandate");
    return {
      status: m.status,
      perPurchaseCapMinor: m.perPurchaseCap.amountMinor,
      remainingMinor: m.remaining.amountMinor,
      currency: m.remaining.currency,
    };
  }

  async search(context: StoreContext, query: string, limit: number): Promise<Candidate[]> {
    const params = new URLSearchParams({ q: query, limit: String(limit) });
    const results = await this.call<ApiProduct[]>(context, "GET", `/v1/catalog/search?${params.toString()}`);
    return results.map(toCandidate);
  }

  async getProduct(context: StoreContext, productId: string): Promise<Candidate> {
    if (!isUUID(productId)) throw new StoreError("NOT_FOUND", "Product not found.");
    return toCandidate(await this.call<ApiProduct>(context, "GET", `/v1/catalog/products/${encodeURIComponent(productId)}`));
  }

  async checkout(context: StoreContext, request: CheckoutRequest): Promise<{ orderId: string }> {
    // One checkout per run: the run id is the idempotency key, so a retry never pays twice.
    const order = await this.call<{ id: string }>(context, "POST", "/v1/checkout", request, {
      "Idempotency-Key": context.runId,
    });
    return { orderId: order.id };
  }

  private async call<T>(
    context: StoreContext,
    method: "GET" | "POST",
    path: string,
    body?: unknown,
    extraHeaders: Record<string, string> = {},
  ): Promise<T> {
    let response: Response;
    try {
      response = await fetch(new URL(path, this.config.API_INTERNAL_BASE_URL), {
        method,
        headers: {
          Authorization: `Bearer ${context.key}`,
          "X-Correlation-Id": context.correlationId,
          "X-Agent-Run-Id": context.runId,
          ...(body === undefined ? {} : { "Content-Type": "application/json" }),
          ...extraHeaders,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error) {
      const timedOut = error instanceof DOMException && error.name === "TimeoutError";
      throw new StoreError(
        "STORE_UNAVAILABLE",
        timedOut ? `The store API did not answer within ${this.timeoutMs} ms.` : "The store API could not be reached.",
      );
    }
    const payload: unknown = await response.json().catch(() => undefined);
    if (!response.ok) {
      const error = (payload as { error?: { code?: unknown; message?: unknown } } | undefined)?.error;
      const code = typeof error?.code === "string" ? error.code : `HTTP_${response.status}`;
      const message = typeof error?.message === "string" ? error.message : `HTTP ${response.status}`;
      throw new StoreError(code, message);
    }
    if (payload === undefined || payload === null || typeof payload !== "object") {
      throw new StoreError("STORE_BAD_RESPONSE", `The store API answered ${path} without a JSON body.`);
    }
    return payload as T;
  }
}
