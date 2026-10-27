import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { json, makeAgent, makeOrder, makeRun, stubApi } from "@/test-utils";
import { useAgentActivity } from "./useAgentActivity";
import type { Agent } from "../useAgents";

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function withMandate(id: string, status = "active"): Agent {
  const base = makeAgent({ id: `a-${id}`, status });
  return { ...base, mandate: { ...base.mandate, id } } as Agent;
}

describe("useAgentActivity", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("groups orders by mandate and finds the running run of active mandates only", async () => {
    const calls = stubApi((request) => {
      const path = new URL(request.url).pathname;
      if (path === "/v1/orders")
        return json(200, [
          { ...makeOrder({ id: "o2" }), mandateId: "m1", placedAt: "2026-10-26T10:00:00.000Z" },
          { ...makeOrder({ id: "o1" }), mandateId: "m1", placedAt: "2026-10-19T10:00:00.000Z" },
          { ...makeOrder({ id: "o3" }), mandateId: "m2", placedAt: "2026-10-20T10:00:00.000Z" },
        ]);
      if (path === "/v1/mandates/m1/runs") return json(200, [makeRun({ id: "r-old", status: "completed" }), makeRun({ id: "r-live" })]);
      if (path === "/v1/mandates/m2/runs") return json(200, [makeRun({ id: "r-done", status: "completed" })]);
      return undefined;
    });

    const { result } = renderHook(() => useAgentActivity([withMandate("m1"), withMandate("m2"), withMandate("m3", "expired")]), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.ordersByMandate.get("m1")?.map((o) => o.id)).toEqual(["o1", "o2"]);
    expect(result.current.ordersByMandate.get("m2")?.map((o) => o.id)).toEqual(["o3"]);
    expect(result.current.runningByMandate.get("m1")?.id).toBe("r-live");
    expect(result.current.runningByMandate.has("m2")).toBe(false);
    expect(calls.filter((c) => c.path.endsWith("/runs")).map((c) => c.path)).toEqual([
      "/v1/mandates/m1/runs",
      "/v1/mandates/m2/runs",
    ]);
  });
});
