import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { apiError, json, makeAgent, makeOrder, never, onceThen, renderAt, stubApi } from "@/test-utils";

const RUNNING_KIT = "01900000-0000-7000-8000-00000000aa01";
const KITCHEN_REFRESH = "01900000-0000-7000-8000-00000000aa02";

const agentWithMandate = (name: string, mandateId: string) => ({
  ...makeAgent({ id: `agent-${mandateId}`, name }),
  mandate: { ...makeAgent().mandate, id: mandateId },
});

const order = (id: string, mandateId: string, placedAt: string, amountMinor: number, runId: string | null = null) => ({
  ...makeOrder({ id, runId }),
  mandateId,
  placedAt,
  total: { amountMinor, currency: "EUR" },
});

const twoAgentsApi = (orders: unknown[]) =>
  stubApi((request) => {
    const path = new URL(request.url).pathname;
    if (path === "/v1/orders") return json(200, orders);
    if (path === "/v1/agents")
      return json(200, [agentWithMandate("Running kit", RUNNING_KIT), agentWithMandate("Kitchen refresh", KITCHEN_REFRESH)]);
    return undefined;
  });

describe("OrdersPage", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("lists each order with its merchant, agent, time, total and a link to its decision log", async () => {
    twoAgentsApi([order("o1", RUNNING_KIT, "2026-10-23T10:00:04Z", 7900, "run-1")]);
    renderAt("/orders");

    const row = (await screen.findByRole("link", { name: "RunBuds Pro Running Earbuds" })).closest("tr");
    expect(row).not.toBeNull();
    const cells = within(row as HTMLElement);
    expect(cells.getByText("TechCorner")).toBeInTheDocument();
    expect(await cells.findByText("Running kit")).toBeInTheDocument();
    expect(cells.getByText(/23 Oct 2026/)).toBeInTheDocument();
    expect(cells.getByText("79.00 EUR")).toBeInTheDocument();
    expect(cells.getByRole("link", { name: "Decision log for RunBuds Pro Running Earbuds" })).toHaveAttribute("href", "/runs/run-1");
  });

  it("groups orders by month with a subtotal and a grand total", async () => {
    twoAgentsApi([
      order("o1", RUNNING_KIT, "2026-10-23T10:00:00Z", 7900),
      order("o2", KITCHEN_REFRESH, "2026-10-21T10:00:00Z", 3900),
      order("o3", RUNNING_KIT, "2026-09-12T10:00:00Z", 2200),
    ]);
    renderAt("/orders");

    expect(await screen.findByText("OCTOBER 2026 · 118.00 EUR")).toBeInTheDocument();
    expect(screen.getByText("SEPTEMBER 2026 · 22.00 EUR")).toBeInTheDocument();
    expect(screen.getByRole("row", { name: /TOTAL/ })).toHaveTextContent("140.00 EUR");
    expect(screen.getByTestId("total")).toHaveTextContent("140.00 EUR");
    expect(screen.getByText(/spent by your agents across 3 orders/)).toBeInTheDocument();
  });

  it("narrows the list and the totals to one agent", async () => {
    twoAgentsApi([
      order("o1", RUNNING_KIT, "2026-10-23T10:00:00Z", 7900),
      order("o2", KITCHEN_REFRESH, "2026-10-21T10:00:00Z", 3900),
    ]);
    renderAt("/orders");

    const all = await screen.findByRole("button", { name: "All agents · 2" });
    expect(all).toHaveAttribute("aria-pressed", "true");

    await userEvent.click(screen.getByRole("button", { name: "Kitchen refresh · 1" }));

    expect(screen.getByRole("button", { name: "Kitchen refresh · 1" })).toHaveAttribute("aria-pressed", "true");
    expect(all).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByTestId("total")).toHaveTextContent("39.00 EUR");
    expect(screen.getByText(/spent by Kitchen refresh across 1 order,/)).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /RunBuds/ })).toHaveLength(1);
  });

  it("still lists the orders, labelled by who placed them, when the agents cannot be loaded", async () => {
    stubApi((request) =>
      new URL(request.url).pathname === "/v1/orders"
        ? json(200, [{ ...makeOrder(), placedBy: "third_party_agent" }])
        : undefined,
    );
    renderAt("/orders");

    expect(await screen.findByText("External agent")).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Filter by agent" })).not.toBeInTheDocument();
  });

  it("explains where orders come from when there is none yet", async () => {
    stubApi((request) => (new URL(request.url).pathname === "/v1/orders" ? json(200, []) : undefined));
    renderAt("/orders");
    expect(await screen.findByText("Orders appear once an agent buys something.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go to Agents" })).toHaveAttribute("href", "/agents");
  });

  it("shows a placeholder while the orders load", async () => {
    stubApi((request) => (new URL(request.url).pathname === "/v1/orders" ? never() : undefined));
    renderAt("/orders");
    await vi.waitFor(() => expect(document.querySelector("main [aria-busy='true']")).not.toBeNull());
  });

  it("retries the orders in place after a failure", async () => {
    const orders = onceThen(() => apiError(500, "INTERNAL_ERROR", "Boom"), () => json(200, [makeOrder()]));
    stubApi((request) => (new URL(request.url).pathname === "/v1/orders" ? orders() : undefined));
    renderAt("/orders");

    expect(await screen.findByRole("alert")).toHaveTextContent("Orders could not be loaded.");
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("RunBuds Pro Running Earbuds")).toBeInTheDocument();
  });
});
