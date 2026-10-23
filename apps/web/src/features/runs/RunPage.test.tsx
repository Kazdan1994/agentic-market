import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { json, makeOrder, makeRun, renderAt, stubApi } from "@/test-utils";

const RUN_PATH = "/runs/01900000-0000-7000-8000-0000000a7001";

describe("RunPage", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("polls while running, then shows the outcome, strategy and order", async () => {
    let polls = 0;
    const calls = stubApi((request) => {
      const path = new URL(request.url).pathname;
      if (path.startsWith("/v1/runs/")) {
        polls += 1;
        return json(
          200,
          polls < 2
            ? makeRun()
            : makeRun({
                status: "completed",
                outcome: "order_placed",
                strategy: "ai",
                orderId: "01900000-0000-7000-8000-0000000a0d01",
              }),
        );
      }
      if (path.startsWith("/v1/orders/")) return json(200, makeOrder());
      return undefined;
    });
    renderAt(RUN_PATH);

    expect(await screen.findByText("Shopping…")).toBeInTheDocument();
    expect(await screen.findByText("Order placed", {}, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.getByText("Chosen by the local AI")).toBeInTheDocument();
    expect(await screen.findByText("RunBuds Pro Running Earbuds")).toBeInTheDocument();
    expect(screen.getByText("TechCorner")).toBeInTheDocument();
    expect(screen.getByText("79.00 EUR")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View order" })).toHaveAttribute(
      "href",
      "/orders/01900000-0000-7000-8000-0000000a0d01",
    );
    expect(calls.filter((call) => call.path.startsWith("/v1/runs/")).length).toBe(2);
  });

  it("shows the rules strategy with its fallback reason", async () => {
    stubApi((request) =>
      new URL(request.url).pathname.startsWith("/v1/runs/")
        ? json(
            200,
            makeRun({ status: "completed", outcome: "no_eligible_product", strategy: "rules", fallbackReason: "timeout" }),
          )
        : undefined,
    );
    renderAt(RUN_PATH);

    expect(await screen.findByText("Nothing to buy within the mandate")).toBeInTheDocument();
    expect(screen.getByText("Chosen by the rules (the local AI took too long)")).toBeInTheDocument();
  });
});
