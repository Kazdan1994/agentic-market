import { createServer, type IncomingHttpHeaders, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { StoreError } from "../domain/store.port";
import { HttpStoreAdapter } from "./http-store.adapter";

interface Seen {
  method: string;
  url: string;
  headers: IncomingHttpHeaders;
  body: unknown;
}

const PRODUCT = {
  id: "00000000-0000-7000-8000-0000000000e1",
  itemRef: "audio-runbuds-pro",
  name: "RunBuds Pro",
  description: "Wireless running earbuds",
  category: { slug: "audio", name: "Audio" },
  merchant: { id: "00000000-0000-7000-8000-0000000000f1", slug: "techcorner", name: "TechCorner" },
  price: { amountMinor: 7900, currency: "EUR" },
  stock: 5,
  listedAt: "2026-09-01T08:00:00.000Z",
};

describe("HttpStoreAdapter", () => {
  let server: Server;
  let baseUrl: string;
  const seen: Seen[] = [];
  let checkoutStatus = 201;

  beforeAll(async () => {
    server = createServer((req, res) => {
      let raw = "";
      req.on("data", (chunk) => (raw += chunk));
      req.on("end", () => {
        seen.push({ method: req.method ?? "", url: req.url ?? "", headers: req.headers, body: raw ? JSON.parse(raw) : undefined });
        res.setHeader("Content-Type", "application/json");
        if (req.url === "/v1/mandate") {
          res.end(JSON.stringify({ status: "active", perPurchaseCap: { amountMinor: 10000, currency: "EUR" }, remaining: { amountMinor: 15000, currency: "EUR" } }));
        } else if (req.url?.startsWith("/v1/catalog/search")) {
          res.end(JSON.stringify([{ ...PRODUCT, eligibility: { eligible: true, reasonCode: null } }]));
        } else if (req.url?.startsWith("/v1/catalog/products/")) {
          if (req.url.endsWith("slow")) return; // never answers
          res.setHeader("Content-Type", "text/plain");
          res.end("ok");
        } else if (req.url === "/v1/checkout") {
          res.statusCode = checkoutStatus;
          res.end(
            JSON.stringify(
              checkoutStatus === 201
                ? { id: "00000000-0000-7000-8000-0000000000aa", total: { amountMinor: 7900, currency: "EUR" } }
                : { error: { code: checkoutStatus === 402 ? "PAYMENT_DECLINED" : "OVER_REMAINING_BUDGET", message: "no" } },
            ),
          );
        } else {
          res.statusCode = 404;
          res.end(JSON.stringify({ error: { code: "NOT_FOUND", message: "missing" } }));
        }
      });
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));
  beforeEach(() => {
    seen.length = 0;
    checkoutStatus = 201;
  });

  const context = {
    key: "amk_builtin",
    runId: "00000000-0000-7000-8000-0000000000bb",
    correlationId: "00000000-0000-7000-8000-0000000000cc",
  };
  const adapter = () => new HttpStoreAdapter({ API_INTERNAL_BASE_URL: baseUrl });

  it("reads the mandate with the key, correlation id and run id", async () => {
    const limits = await adapter().getMandate(context);
    expect(limits).toEqual({ status: "active", perPurchaseCapMinor: 10000, remainingMinor: 15000, currency: "EUR" });
    expect(seen[0]?.headers).toMatchObject({
      authorization: "Bearer amk_builtin",
      "x-correlation-id": context.correlationId,
      "x-agent-run-id": context.runId,
    });
  });

  it("searches and maps results to candidates", async () => {
    const [found] = await adapter().search(context, "wireless earbuds", 20);
    expect(seen[0]?.url).toBe("/v1/catalog/search?q=wireless+earbuds&limit=20");
    expect(found).toMatchObject({
      productId: PRODUCT.id,
      itemRef: "audio-runbuds-pro",
      merchantName: "TechCorner",
      categoryName: "Audio",
      priceMinor: 7900,
      eligibility: { eligible: true, reasonCode: null },
    });
    expect(found?.listedAt).toEqual(new Date(PRODUCT.listedAt));
  });

  it("checks out with Idempotency-Key = run id", async () => {
    const result = await adapter().checkout(context, { productId: PRODUCT.id, expectedPriceMinor: 7900 });
    expect(result).toEqual({ orderId: "00000000-0000-7000-8000-0000000000aa" });
    expect(seen[0]).toMatchObject({
      method: "POST",
      url: "/v1/checkout",
      body: { productId: PRODUCT.id, expectedPriceMinor: 7900 },
    });
    expect(seen[0]?.headers["idempotency-key"]).toBe(context.runId);
  });

  it.each([
    [402, "PAYMENT_DECLINED"],
    [409, "OVER_REMAINING_BUDGET"],
  ])("maps HTTP %i to a typed StoreError %s", async (status, code) => {
    checkoutStatus = status;
    const error = await adapter()
      .checkout(context, { productId: PRODUCT.id, expectedPriceMinor: 7900 })
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(StoreError);
    expect((error as StoreError).code).toBe(code);
  });

  it("rejects a 2xx answer without a JSON body", async () => {
    const error = await adapter()
      .getProduct(context, "00000000-0000-7000-8000-0000000000e1")
      .catch((e: unknown) => e);
    expect((error as StoreError).code).toBe("STORE_BAD_RESPONSE");
  });

  it("gives up on a call that does not answer in time", async () => {
    const slow = new HttpStoreAdapter({ API_INTERNAL_BASE_URL: baseUrl }, 200);
    // Bypasses the uuid check to reach the stub's never-answering route.
    const error = await (slow as unknown as { call: (...a: unknown[]) => Promise<unknown> })
      .call(context, "GET", "/v1/catalog/products/slow")
      .catch((e: unknown) => e);
    expect((error as StoreError).code).toBe("STORE_UNAVAILABLE");
    expect((error as StoreError).message).toContain("200 ms");
  });

  it("does not let a product id escape its path", async () => {
    const error = await adapter().getProduct(context, "..").catch((e: unknown) => e);
    expect((error as StoreError).code).toBe("NOT_FOUND");
    expect(seen).toHaveLength(0);
  });

  it("reports an unreachable API as STORE_UNAVAILABLE", async () => {
    const error = await new HttpStoreAdapter({ API_INTERNAL_BASE_URL: "http://127.0.0.1:1" })
      .getMandate(context)
      .catch((e: unknown) => e);
    expect((error as StoreError).code).toBe("STORE_UNAVAILABLE");
  });
});
