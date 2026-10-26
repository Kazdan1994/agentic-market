import { screen } from "@testing-library/react";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FakeEventSource, json, makeLogEntry, makeOrder, makeRun, renderAt, stubApi } from "@/test-utils";

const RUN_ID = "01900000-0000-7000-8000-0000000a7001";
const RUN_PATH = `/runs/${RUN_ID}`;

describe("RunPage", () => {
  beforeEach(() => FakeEventSource.install());
  afterEach(() => vi.unstubAllGlobals());

  it("follows the run live, then shows the outcome, strategy, order and decision log", async () => {
    const calls = stubApi((request) => {
      const path = new URL(request.url).pathname;
      if (path.startsWith("/v1/runs/")) return json(200, makeRun());
      if (path.startsWith("/v1/orders/")) return json(200, makeOrder());
      return undefined;
    });
    renderAt(RUN_PATH);

    expect(await screen.findByText("Shopping…")).toBeInTheDocument();
    const source = FakeEventSource.last();
    expect(source.url).toBe(`/v1/runs/${RUN_ID}/events`);

    act(() => source.emit("log", makeLogEntry(1, { message: "Searched for earbuds: 2 results." }), "1"));
    expect(await screen.findByText("Searched for earbuds: 2 results.")).toBeInTheDocument();
    expect(screen.getByText("Shopping…")).toBeInTheDocument();

    act(() =>
      source.emit(
        "run.completed",
        makeRun({ status: "completed", outcome: "order_placed", strategy: "ai", orderId: "01900000-0000-7000-8000-0000000a0d01" }),
      ),
    );
    expect(await screen.findByText("Order placed")).toBeInTheDocument();
    expect(screen.getByText("Chosen by the local AI")).toBeInTheDocument();
    expect(await screen.findByText("RunBuds Pro Running Earbuds")).toBeInTheDocument();
    expect(screen.getByText("79.00 EUR")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Decision log" })).toBeInTheDocument();
    expect(source.closed).toBe(true);
    // The stream replaced polling: the run itself was fetched once.
    expect(calls.filter((call) => call.path === `/v1/runs/${RUN_ID}`)).toHaveLength(1);
  });

  it("shows the rules strategy with its fallback reason", async () => {
    stubApi((request) =>
      new URL(request.url).pathname.startsWith("/v1/runs/")
        ? json(200, makeRun({ status: "completed", outcome: "no_eligible_product", strategy: "rules", fallbackReason: "timeout" }))
        : undefined,
    );
    renderAt(RUN_PATH);

    expect(await screen.findByText("Nothing to buy within the mandate")).toBeInTheDocument();
    expect(screen.getByText("Chosen by the rules (the local AI took too long)")).toBeInTheDocument();
  });
});
