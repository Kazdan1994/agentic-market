import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { json, makeOrder, renderAt, stubApi } from "@/test-utils";

describe("OrdersPage", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("lists product, merchant, total, status, time and who placed each order", async () => {
    stubApi((request) =>
      new URL(request.url).pathname === "/v1/orders"
        ? json(200, [makeOrder(), makeOrder({ id: "01900000-0000-7000-8000-0000000a0d02", placedBy: "third_party_agent" })])
        : undefined,
    );
    renderAt("/orders");

    expect(await screen.findAllByText("RunBuds Pro Running Earbuds")).toHaveLength(2);
    expect(screen.getAllByText("TechCorner")).toHaveLength(2);
    expect(screen.getAllByText("79.00 EUR")).toHaveLength(2);
    expect(screen.getAllByText("Paid (simulated)")).toHaveLength(2);
    expect(screen.getByText("Built-in agent")).toBeInTheDocument();
    expect(screen.getByText("External agent")).toBeInTheDocument();
    expect(screen.getAllByText(/23 Oct 2026/)).toHaveLength(2);
  });

  it("says so when there is no order yet", async () => {
    stubApi((request) => (new URL(request.url).pathname === "/v1/orders" ? json(200, []) : undefined));
    renderAt("/orders");
    expect(await screen.findByText(/No order yet/)).toBeInTheDocument();
  });
});
