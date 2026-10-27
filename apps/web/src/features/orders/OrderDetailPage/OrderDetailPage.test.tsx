import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { apiError, json, makeAgent, makeLogEntry, makeOrder, makeRun, never, onceThen, renderAt, stubApi } from "@/test-utils";

const ORDER_PATH = "/orders/01900000-0000-7000-8000-0000000a0d01";
const RUN_ID = "01900000-0000-7000-8000-0000000a7001";

describe("OrderDetailPage", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("shows the order and links to the decision log of the run that placed it", async () => {
    stubApi((request) => (new URL(request.url).pathname.startsWith("/v1/orders/") ? json(200, makeOrder()) : undefined));
    renderAt(ORDER_PATH);

    expect(await screen.findByText("RunBuds Pro Running Earbuds")).toBeInTheDocument();
    expect(screen.getByText("PAID · SIMULATED CHECKOUT APPROVED")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Read the decision log" })).toHaveAttribute("href", `/runs/${RUN_ID}`);
  });

  it("prints the order as a receipt: parties, short numbers, unit price and total", async () => {
    stubApi((request) => {
      const path = new URL(request.url).pathname;
      if (path.startsWith("/v1/orders/")) return json(200, makeOrder());
      if (path === "/v1/agents") return json(200, [makeAgent({ name: "Running kit" })]);
      return undefined;
    });
    renderAt(ORDER_PATH);

    const receipt = (await screen.findByRole("heading", { name: "ORDER Nº 000A-0D01" })).closest("article");
    const scope = within(receipt as HTMLElement);
    expect(scope.getByText("TechCorner")).toBeInTheDocument();
    expect(await scope.findByText("Running kit")).toBeInTheDocument();
    expect(scope.getByText("Nº AA01")).toBeInTheDocument();
    expect(scope.getByText("RunBuds Pro Running Earbuds").parentElement).toHaveTextContent("1 × RunBuds Pro Running Earbuds");
    expect(scope.getAllByText("79.00 EUR")).toHaveLength(2);
  });

  it("says why the agent chose this product, from the selection step of its run", async () => {
    stubApi((request) => {
      const path = new URL(request.url).pathname;
      if (path.startsWith("/v1/orders/")) return json(200, makeOrder());
      if (path === `/v1/runs/${RUN_ID}/log`)
        return json(200, [
          makeLogEntry(1, { step: "search" }),
          makeLogEntry(2, { step: "selection", message: "Built for running. Chosen by the local AI." }),
        ]);
      if (path === `/v1/runs/${RUN_ID}`) return json(200, makeRun());
      return undefined;
    });
    renderAt(ORDER_PATH);

    const why = await screen.findByRole("region", { name: "Why the agent bought this" });
    expect(await within(why).findByText("Built for running. Chosen by the local AI.")).toBeInTheDocument();
    expect(within(why).getByText("Asked for “wireless headphones for running”.")).toBeInTheDocument();
  });

  it("says so when the agent's reason cannot be loaded, and still links to the decision log", async () => {
    stubApi((request) => {
      const path = new URL(request.url).pathname;
      if (path.startsWith("/v1/orders/")) return json(200, makeOrder());
      if (path === `/v1/runs/${RUN_ID}/log`) return apiError(500, "INTERNAL_ERROR", "Boom");
      return undefined;
    });
    renderAt(ORDER_PATH);

    expect(await screen.findByText("The agent's reason could not be loaded.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Read the decision log" })).toHaveAttribute("href", `/runs/${RUN_ID}`);
  });

  it("keeps a page heading while the order loads", () => {
    stubApi((request) => (new URL(request.url).pathname.startsWith("/v1/orders/") ? never() : undefined));
    renderAt(ORDER_PATH);
    return screen.findByRole("heading", { level: 1, name: "Order" });
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
    expect(screen.queryByRole("link", { name: "Read the decision log" })).not.toBeInTheDocument();
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
