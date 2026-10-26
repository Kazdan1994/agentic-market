import { EventEmitter } from "node:events";
import { Subject } from "rxjs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RunLogPublisher } from "../run-log.publisher";
import { RunEventsController } from "./run-events.controller";

const RUN_ID = "00000000-0000-7000-8000-000000000301";

class FakeResponse {
  readonly chunks: string[] = [];
  ended = false;
  status = 0;
  headers: Record<string, string> = {};
  writeHead(status: number, headers: Record<string, string>) {
    this.status = status;
    this.headers = headers;
    return this;
  }
  flushHeaders() {}
  write(chunk: string) {
    this.chunks.push(chunk);
    return true;
  }
  end() {
    this.ended = true;
  }
}

const running = { id: RUN_ID, status: "running" };

function controller() {
  const queries = { execute: vi.fn(async (query: object) => (query.constructor.name === "GetRunQuery" ? running : [])) };
  return new RunEventsController(queries as never, new RunLogPublisher(new Subject<object>()), 15_000);
}

describe("RunEventsController", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("sends a ping comment every 15 s while the run is open and stops when the client leaves", async () => {
    const req = new EventEmitter();
    const res = new FakeResponse();
    await controller().events({ userId: "u" } as never, RUN_ID, undefined, req as never, res as never);

    expect(res.status).toBe(200);
    expect(res.headers["Content-Type"]).toBe("text/event-stream");
    vi.advanceTimersByTime(14_999);
    expect(res.chunks.filter((c) => c === ": ping\n\n")).toHaveLength(0);
    vi.advanceTimersByTime(1);
    vi.advanceTimersByTime(15_000);
    expect(res.chunks.filter((c) => c === ": ping\n\n")).toHaveLength(2);

    req.emit("close");
    vi.advanceTimersByTime(60_000);
    expect(res.chunks.filter((c) => c === ": ping\n\n")).toHaveLength(2);
  });
});
