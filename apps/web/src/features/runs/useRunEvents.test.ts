import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FakeEventSource, makeLogEntry, makeRun } from "@/test-utils";
import { useRunEvents } from "./useRunEvents";

const RUN_ID = "01900000-0000-7000-8000-0000000a7001";

function setup() {
  const queryClient = new QueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client: queryClient }, children);
  const hook = renderHook(() => useRunEvents(RUN_ID), { wrapper });
  return { queryClient, hook, source: FakeEventSource.last() };
}

describe("useRunEvents", () => {
  beforeEach(() => FakeEventSource.install());
  afterEach(() => vi.unstubAllGlobals());

  it("opens the run's event stream with the session cookie", () => {
    const { source } = setup();
    expect(source.url).toBe(`/v1/runs/${RUN_ID}/events`);
    expect(source.init).toEqual({ withCredentials: true });
  });

  it("adds entries in seq order", () => {
    const { hook, source } = setup();
    act(() => {
      source.emit("log", makeLogEntry(2), "2");
      source.emit("log", makeLogEntry(1), "1");
      source.emit("log", makeLogEntry(3), "3");
    });
    expect(hook.result.current.entries.map((e) => e.seq)).toEqual([1, 2, 3]);
  });

  it("ignores an entry it already has, as after a reconnect", () => {
    const { hook, source } = setup();
    act(() => {
      source.emit("log", makeLogEntry(1), "1");
      source.emit("log", makeLogEntry(2), "2");
      source.emit("log", makeLogEntry(2, { message: "replayed" }), "2");
    });
    expect(hook.result.current.entries.map((e) => e.message)).toEqual(["Entry 1", "Entry 2"]);
  });

  it("stores the completed run and closes the stream on run.completed", () => {
    const { hook, queryClient, source } = setup();
    const completed = makeRun({ status: "completed", outcome: "order_placed", strategy: "rules" });
    act(() => source.emit("run.completed", completed));
    expect(queryClient.getQueryData(["runs", RUN_ID])).toEqual(completed);
    expect(hook.result.current.completed).toBe(true);
    expect(source.closed).toBe(true);
  });

  it("closes the stream when the page goes away", () => {
    const { hook, source } = setup();
    hook.unmount();
    expect(source.closed).toBe(true);
  });
});
