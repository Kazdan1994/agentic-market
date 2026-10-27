import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { apiError, json, makeOrder, never, onceThen, renderAt, stubApi } from "@/test-utils";

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
