import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { apiError, json, makeOrder, never, onceThen, renderAt, stubApi } from "@/test-utils";

const ORDER_PATH = "/orders/01900000-0000-7000-8000-0000000a0d01";

describe("OrderDetailPage", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("shows the order and links to the decision log of the run that placed it", async () => {
    stubApi((request) => (new URL(request.url).pathname.startsWith("/v1/orders/") ? json(200, makeOrder()) : undefined));
    renderAt(ORDER_PATH);

    expect(await screen.findByText("RunBuds Pro Running Earbuds")).toBeInTheDocument();
    expect(screen.getByText("Paid (simulated)")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Decision log" })).toHaveAttribute(
      "href",
      "/runs/01900000-0000-7000-8000-0000000a7001",
    );
  });

  it("links back to the orders list", async () => {
    stubApi((request) => (new URL(request.url).pathname.startsWith("/v1/orders/") ? json(200, makeOrder()) : undefined));
    renderAt(ORDER_PATH);
    expect(await screen.findByRole("link", { name: "Back to Orders" })).toHaveAttribute("href", "/orders");
  });

  it("has no run link for orders placed by an external agent", async () => {
    stubApi((request) =>
      new URL(request.url).pathname.startsWith("/v1/orders/")
        ? json(200, makeOrder({ runId: null, placedBy: "third_party_agent" }))
        : undefined,
    );
    renderAt(ORDER_PATH);

    expect(await screen.findByText("External agent")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Decision log" })).not.toBeInTheDocument();
  });

  it("shows not found for an unknown order, with a way back", async () => {
    stubApi(() => undefined);
    renderAt(ORDER_PATH);
    const message = await screen.findByText("This order doesn't exist.");
    expect(within(message.parentElement as HTMLElement).getByRole("link", { name: "Back to Orders" })).toHaveAttribute("href", "/orders");
  });

  it("shows a placeholder while the order loads", async () => {
    stubApi((request) => (new URL(request.url).pathname.startsWith("/v1/orders/") ? never() : undefined));
    renderAt(ORDER_PATH);
    await vi.waitFor(() => expect(document.querySelector("main [aria-busy='true']")).not.toBeNull());
  });

  it("retries the order in place after a failure", async () => {
    const order = onceThen(() => apiError(500, "INTERNAL_ERROR", "Boom"), () => json(200, makeOrder()));
    stubApi((request) => (new URL(request.url).pathname.startsWith("/v1/orders/") ? order() : undefined));
    renderAt(ORDER_PATH);

    expect(await screen.findByRole("alert")).toHaveTextContent("Order could not be loaded.");
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("RunBuds Pro Running Earbuds")).toBeInTheDocument();
  });
});
