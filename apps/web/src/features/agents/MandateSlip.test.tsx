import { render, screen, within } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import type { Order } from "@/features/orders/useOrders";
import type { Run } from "@/features/runs/useRun";
import { makeAgent, makeOrder, makeRun } from "@/test-utils";
import { MandateSlip } from "./MandateSlip";
import type { Agent } from "./useAgents";

const NOW = new Date("2026-10-26T15:20:00.000Z");

function order(id: string, cents: number, product = `Item ${id}`): Order {
  const base = makeOrder({ id });
  return { ...base, product: { ...base.product, name: product }, total: { amountMinor: cents, currency: "EUR" } } as Order;
}

function renderSlip(agent: Agent, orders: Order[], run?: Run) {
  const router = createMemoryRouter([{ path: "/", element: <MandateSlip agent={agent} orders={orders} run={run} now={NOW} /> }]);
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return within(screen.getByRole("article"));
}

describe("MandateSlip", () => {
  const agent = makeAgent({ name: "Pantry restock", spent: 5750 }) as Agent;
  const orders = [order("1", 2290, "Dishwasher tablets"), order("2", 3460, "Oat milk")];

  it("prints the mandate like a receipt", () => {
    const slip = renderSlip(agent, orders);
    expect(slip.getByRole("heading", { name: "Pantry restock" })).toBeInTheDocument();
    expect(slip.getByText("MANDATE Nº AA01")).toBeInTheDocument();
    expect(slip.getByText("Audio")).toBeInTheDocument();
    expect(slip.getByTestId("left")).toHaveTextContent("92.50 EUR");
    expect(slip.getByRole("img", { name: "57.50 EUR of 150.00 EUR spent, cap 100.00 EUR per purchase" })).toBeInTheDocument();
    expect(slip.getByText("Dishwasher tablets")).toBeInTheDocument();
    expect(slip.getByText("34.60 EUR")).toBeInTheDocument();
    expect(slip.getByTestId("spent")).toHaveTextContent("57.50 EUR");
    expect(slip.getByText("Active")).toBeInTheDocument();
    expect(slip.getByRole("button", { name: "Start run" })).toBeInTheDocument();
  });

  it("agrees with its own lines: SPENT is the sum of the orders", () => {
    const sum = orders.reduce((total, o) => total + o.total.amountMinor, 0);
    expect(sum).toBe(agent.mandate.spent.amountMinor);
  });

  it("caps the lines at five and says how many more", () => {
    const many = Array.from({ length: 7 }, (_, i) => order(String(i), 100));
    const slip = renderSlip(agent, many);
    expect(slip.getAllByTestId("line")).toHaveLength(5);
    expect(slip.getByText("+2 more")).toBeInTheDocument();
  });

  it("says when nothing was bought yet", () => {
    const slip = renderSlip(makeAgent({ name: "Gift" }) as Agent, []);
    expect(slip.getByText("No purchase yet")).toBeInTheDocument();
  });

  it("links to the run while the agent is shopping", () => {
    const slip = renderSlip(agent, orders, makeRun() as Run);
    expect(slip.getByText("Shopping now")).toBeInTheDocument();
    expect(slip.getByRole("link", { name: "Watch run" })).toHaveAttribute("href", "/runs/01900000-0000-7000-8000-0000000a7001");
    expect(slip.queryByRole("button", { name: "Start run" })).toBeNull();
  });
});
