import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { json, makeOrder, renderAt, stubApi } from "@/test-utils";

const ORDER_PATH = "/orders/01900000-0000-7000-8000-0000000a0d01";

describe("OrderDetailPage", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("shows the order and links to the run that placed it", async () => {
    stubApi((request) => (new URL(request.url).pathname.startsWith("/v1/orders/") ? json(200, makeOrder()) : undefined));
    renderAt(ORDER_PATH);

    expect(await screen.findByText("RunBuds Pro Running Earbuds")).toBeInTheDocument();
    expect(screen.getByText("Paid (simulated)")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View the run" })).toHaveAttribute(
      "href",
      "/runs/01900000-0000-7000-8000-0000000a7001",
    );
  });

  it("has no run link for orders placed by an external agent", async () => {
    stubApi((request) =>
      new URL(request.url).pathname.startsWith("/v1/orders/")
        ? json(200, makeOrder({ runId: null, placedBy: "third_party_agent" }))
        : undefined,
    );
    renderAt(ORDER_PATH);

    expect(await screen.findByText("External agent")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "View the run" })).not.toBeInTheDocument();
  });

  it("shows not found for an unknown order", async () => {
    stubApi(() => undefined);
    renderAt(ORDER_PATH);
    expect(await screen.findByRole("alert")).toHaveTextContent("This order could not be found.");
  });
});
