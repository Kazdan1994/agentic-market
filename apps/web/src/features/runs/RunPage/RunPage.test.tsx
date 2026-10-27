import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiError, FakeEventSource, json, makeLogEntry, makeOrder, makeRun, never, onceThen, renderAt, stubApi } from "@/test-utils";

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

  it("shows a placeholder while the run loads", async () => {
    stubApi((request) => (new URL(request.url).pathname.startsWith("/v1/runs/") ? never() : undefined));
    renderAt(RUN_PATH);
    await vi.waitFor(() => expect(document.querySelector("main [aria-busy='true']")).not.toBeNull());
  });

  it("shows not found for an unknown run, with a way back", async () => {
    stubApi(() => undefined);
    renderAt(RUN_PATH);
    const message = await screen.findByText("This run doesn't exist.");
    expect(within(message.parentElement as HTMLElement).getByRole("link", { name: "Back to Agents" })).toHaveAttribute("href", "/agents");
  });

  it("retries the run in place after a failure", async () => {
    const run = onceThen(
      () => apiError(500, "INTERNAL_ERROR", "Boom"),
      () => json(200, makeRun({ status: "completed", outcome: "no_eligible_product", strategy: "rules", fallbackReason: "timeout" })),
    );
    stubApi((request) => (new URL(request.url).pathname.startsWith("/v1/runs/") ? run() : undefined));
    renderAt(RUN_PATH);

    expect(await screen.findByRole("alert")).toHaveTextContent("Run could not be loaded.");
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("Nothing to buy within the mandate")).toBeInTheDocument();
  });

  it("retries the run's order in place after a failure", async () => {
    const order = onceThen(() => apiError(500, "INTERNAL_ERROR", "Boom"), () => json(200, makeOrder()));
    stubApi((request) => {
      const path = new URL(request.url).pathname;
      if (path.startsWith("/v1/runs/"))
        return json(200, makeRun({ status: "completed", outcome: "order_placed", strategy: "ai", orderId: "01900000-0000-7000-8000-0000000a0d01" }));
      if (path.startsWith("/v1/orders/")) return order();
      return undefined;
    });
    renderAt(RUN_PATH);

    expect(await screen.findByRole("alert")).toHaveTextContent("Order could not be loaded.");
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("RunBuds Pro Running Earbuds")).toBeInTheDocument();
  });

  it("links back to the agents", async () => {
    stubApi((request) =>
      new URL(request.url).pathname.startsWith("/v1/runs/")
        ? json(200, makeRun({ status: "completed", outcome: "no_eligible_product" }))
        : undefined,
    );
    renderAt(RUN_PATH);
    expect(await screen.findByRole("link", { name: "Back to Agents" })).toHaveAttribute("href", "/agents");
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
