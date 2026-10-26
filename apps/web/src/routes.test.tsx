import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { json, never, renderAt, stubApi } from "@/test-utils";

describe("navigation bar", () => {
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
