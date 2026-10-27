import { cleanup, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiError, FakeEventSource, json, makeOrder, makeRun, never, renderAt, stubApi } from "@/test-utils";

describe("navigation bar", () => {
  beforeEach(() => FakeEventSource.install());
  afterEach(() => vi.unstubAllGlobals());

  it("links to agents and orders and marks the current page", async () => {
    stubApi((request) => (new URL(request.url).pathname === "/v1/orders" ? json(200, []) : undefined));
    renderAt("/orders");

    const nav = await screen.findByRole("navigation", { name: "Main" });
    expect(within(nav).getByRole("link", { name: "Agents" })).toHaveAttribute("href", "/agents");
    expect(within(nav).getByRole("link", { name: "Orders" })).toHaveAttribute("aria-current", "page");
  });

  it("shows the product wordmark and the signed-in principal", async () => {
    stubApi((request) => (new URL(request.url).pathname === "/v1/orders" ? json(200, []) : undefined));
    renderAt("/orders");

    const nav = await screen.findByRole("navigation", { name: "Main" });
    expect(within(nav).getByRole("link", { name: "Agentic Market" })).toHaveAttribute("href", "/agents");
    expect(within(nav).getByText("Alice")).toBeInTheDocument();
  });

  it("shows a loading indicator while the session is checked", async () => {
    vi.stubGlobal("fetch", vi.fn(() => never()));
    renderAt("/orders");
    expect(await screen.findByRole("status")).toHaveTextContent("Loading…");
  });

  it.each([
    ["/agents", "Agents - Agentic Market"],
    ["/orders", "Orders - Agentic Market"],
    ["/orders/01900000-0000-7000-8000-0000000a0d01", "Order - Agentic Market"],
    ["/runs/01900000-0000-7000-8000-0000000a7001", "Run - Agentic Market"],
  ])("titles %s as %s", async (path, title) => {
    stubApi((request) => {
      const p = new URL(request.url).pathname;
      if (p === "/v1/agents" || p === "/v1/categories" || p === "/v1/orders") return json(200, []);
      if (p.startsWith("/v1/orders/")) return json(200, makeOrder());
      if (p.endsWith("/log")) return json(200, []);
      if (p.startsWith("/v1/runs/")) return json(200, makeRun({ status: "completed", outcome: "no_eligible_product" }));
      return undefined;
    });
    renderAt(path);
    await vi.waitFor(() => expect(document.title).toBe(title));
  });

  it("keeps Orders current on an order and Agents current on a run", async () => {
    stubApi((request) => {
      const p = new URL(request.url).pathname;
      if (p.startsWith("/v1/orders/")) return json(200, makeOrder());
      if (p.endsWith("/log")) return json(200, []);
      if (p.startsWith("/v1/runs/")) return json(200, makeRun({ status: "completed", outcome: "no_eligible_product" }));
      return undefined;
    });
    renderAt("/orders/01900000-0000-7000-8000-0000000a0d01");
    let nav = await screen.findByRole("navigation", { name: "Main" });
    expect(within(nav).getByRole("link", { name: "Orders" })).toHaveAttribute("aria-current", "page");

    cleanup();
    renderAt("/runs/01900000-0000-7000-8000-0000000a7001");
    nav = await screen.findByRole("navigation", { name: "Main" });
    expect(within(nav).getByRole("link", { name: "Agents" })).toHaveAttribute("aria-current", "page");
  });

  it("says so when logging out fails and stays signed in", async () => {
    const router = (() => {
      stubApi((request) => {
        const p = new URL(request.url).pathname;
        if (p === "/v1/orders") return json(200, []);
        if (p === "/v1/auth/logout") return apiError(500, "INTERNAL_ERROR", "Boom");
        return undefined;
      });
      return renderAt("/orders");
    })();

    await userEvent.click(await screen.findByRole("button", { name: "Log out" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not log out. Try again.");
    expect(router.state.location.pathname).toBe("/orders");
  });

  it("logs out and returns to the login page", async () => {
    const calls = stubApi((request) => {
      const path = new URL(request.url).pathname;
      if (path === "/v1/orders") return json(200, []);
      if (path === "/v1/auth/logout") return new Response(null, { status: 204 });
      return undefined;
    });
    const router = renderAt("/orders");

    await userEvent.click(await screen.findByRole("button", { name: "Log out" }));

    await vi.waitFor(() => expect(router.state.location.pathname).toBe("/login"));
    expect(calls).toContainEqual({ method: "POST", path: "/v1/auth/logout", body: undefined });
  });
});
