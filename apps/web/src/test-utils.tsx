import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { vi } from "vitest";
import { routes } from "@/routes";

export type Route = (request: Request, body: unknown) => Response | undefined;

export const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

export const apiError = (status: number, code: string, message: string, details?: unknown) =>
  json(status, { error: details ? { code, message, details } : { code, message } });

export const alice = {
  id: "01900000-0000-7000-8000-00000000a11c",
  email: "alice@demo.local",
  displayName: "Alice",
};

export type Call = { method: string; path: string; body?: unknown };

/** Stubs `fetch` with a signed-in session; `route` answers everything else. Returns the call log. */
export function stubApi(route: Route): Call[] {
  const calls: Call[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (request: Request) => {
      const path = new URL(request.url).pathname;
      const body = request.method === "GET" ? undefined : await request.clone().json().catch(() => undefined);
      calls.push({ method: request.method, path, body });
      if (path === "/v1/me") return json(200, alice);
      return route(request, body) ?? apiError(404, "NOT_FOUND", "Not found");
    }),
  );
  return calls;
}

export function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return router;
}

const eur = (amountMinor: number) => ({ amountMinor, currency: "EUR" });

export function makeAgent(overrides: { id?: string; name?: string; status?: string; spent?: number } = {}) {
  const spent = overrides.spent ?? 0;
  return {
    id: overrides.id ?? "01900000-0000-7000-8000-0000000a9e01",
    name: overrides.name ?? "Headphones buyer",
    createdAt: "2026-10-20T09:00:00.000Z",
    mandate: {
      id: "01900000-0000-7000-8000-00000000aa01",
      status: overrides.status ?? "active",
      perPurchaseCap: eur(10000),
      totalBudget: eur(15000),
      spent: eur(spent),
      remaining: eur(15000 - spent),
      categories: [{ slug: "audio", name: "Audio" }],
      expiresAt: "2027-01-31T23:00:00.000Z",
      revokedAt: null,
      createdAt: "2026-10-20T09:00:00.000Z",
    },
  };
}

export function makeRun(overrides: Partial<{ id: string; status: string; outcome: string | null; strategy: string | null; fallbackReason: string | null; orderId: string | null }> = {}) {
  return {
    id: "01900000-0000-7000-8000-0000000a7001",
    mandateId: "01900000-0000-7000-8000-00000000aa01",
    request: "wireless headphones for running",
    status: "running",
    outcome: null,
    strategy: null,
    fallbackReason: null,
    orderId: null,
    startedAt: "2026-10-23T10:00:00.000Z",
    endedAt: null,
    ...overrides,
  };
}

export function makeOrder(overrides: Partial<{ id: string; runId: string | null; placedBy: string }> = {}) {
  return {
    id: "01900000-0000-7000-8000-0000000a0d01",
    mandateId: "01900000-0000-7000-8000-00000000aa01",
    runId: "01900000-0000-7000-8000-0000000a7001",
    product: { id: "01900000-0000-7000-8000-0000000a0901", name: "RunBuds Pro Running Earbuds" },
    merchant: { id: "01900000-0000-7000-8000-0000000a0801", slug: "techcorner", name: "TechCorner" },
    unitPrice: eur(7900),
    quantity: 1,
    total: eur(7900),
    status: "paid_simulated",
    placedAt: "2026-10-23T10:00:04.000Z",
    placedBy: "builtin_agent",
    ...overrides,
  };
}
