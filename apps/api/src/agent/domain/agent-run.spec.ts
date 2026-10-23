import { describe, expect, it } from "vitest";
import { DomainError } from "../../shared/errors/domain-error";
import { AgentRun } from "./agent-run";

const NOW = new Date("2026-10-23T12:00:00Z");
const start = (request: string) =>
  AgentRun.start({
    id: "00000000-0000-7000-8000-000000000001",
    mandateId: "00000000-0000-7000-8000-000000000002",
    userId: "00000000-0000-7000-8000-000000000003",
    request,
    correlationId: "00000000-0000-7000-8000-000000000004",
    now: NOW,
  });

describe("AgentRun.start", () => {
  it("trims the request and starts running", () => {
    const run = start("  wireless headphones for running  ");
    expect(run.request).toBe("wireless headphones for running");
    expect(run.status).toBe("running");
    expect(run.outcome).toBeNull();
  });

  it.each(["ab", "x".repeat(501), "   the of   ", "I want the"])("refuses %j with INVALID_REQUEST", (request) => {
    const error = (() => {
      try {
        start(request);
      } catch (e) {
        return e;
      }
      return null;
    })();
    expect(error).toBeInstanceOf(DomainError);
    expect((error as DomainError).code).toBe("INVALID_REQUEST");
  });
});

describe("AgentRun.complete", () => {
  it("completes once with outcome, strategy, fallback reason and end time", () => {
    const done = start("wireless headphones").complete({
      outcome: "order_placed",
      strategy: "rules",
      fallbackReason: "not_configured",
      orderId: "00000000-0000-7000-8000-0000000000aa",
      now: new Date("2026-10-23T12:00:05Z"),
    });
    expect(done).toMatchObject({
      status: "completed",
      outcome: "order_placed",
      strategy: "rules",
      fallbackReason: "not_configured",
      orderId: "00000000-0000-7000-8000-0000000000aa",
    });
    expect(done.endedAt?.toISOString()).toBe("2026-10-23T12:00:05.000Z");
    expect(() => done.complete({ outcome: "interrupted", strategy: null, fallbackReason: null, orderId: null, now: NOW })).toThrow(
      /already completed/,
    );
  });

  it("requires an order id exactly when an order was placed", () => {
    const run = start("wireless headphones");
    expect(() => run.complete({ outcome: "order_placed", strategy: "rules", fallbackReason: null, orderId: null, now: NOW })).toThrow();
    expect(() =>
      run.complete({ outcome: "no_eligible_product", strategy: "rules", fallbackReason: null, orderId: "x", now: NOW }),
    ).toThrow();
  });
});
