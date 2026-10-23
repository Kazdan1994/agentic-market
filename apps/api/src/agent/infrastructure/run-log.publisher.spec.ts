import { Subject } from "rxjs";
import { describe, expect, it } from "vitest";
import { FixedClock } from "../../../test/support/fixed-clock";
import { InMemoryRuns } from "../../../test/support/in-memory-runs";
import { InMemoryStore } from "../../../test/support/in-memory-store";
import { testMandate } from "../../../test/support/mandates";
import { RunCompletedEvent, RunLogAppendedEvent, type RunLogEvent } from "../application/run-log-events";
import { RunExecutor } from "../application/run-executor";
import type { RunLogEntry } from "../domain/run-log-entry";
import { RuleBasedSelector } from "../domain/rule-based-selector";
import { RunLogPublisher } from "./run-log.publisher";

const NOW = new Date("2026-10-23T12:00:00Z");
const RUN_ID = "00000000-0000-7000-8000-000000000201";
const OTHER_RUN_ID = "00000000-0000-7000-8000-000000000202";

class FakeBus extends Subject<object> {
  publish(event: object): void {
    this.next(event);
  }
}

/** Holds each log insert until the test lets it commit. */
class SlowRuns extends InMemoryRuns {
  readonly pending: (() => void)[] = [];

  override async appendLog(entry: RunLogEntry): Promise<void> {
    await new Promise<void>((resolve) => this.pending.push(resolve));
    await super.appendLog(entry);
  }
}

function seed(runs: InMemoryRuns, id: string) {
  runs.seedRunning({ id, mandateId: testMandate().id, userId: testMandate().userId, request: "earbuds", correlationId: id, now: NOW });
}

function executor(runs: InMemoryRuns, bus: FakeBus) {
  const store = new InMemoryStore(testMandate(), [], () => NOW);
  const logger = { info: () => undefined, error: () => undefined };
  return new RunExecutor(runs, store, { keyFor: () => "amk" }, new RuleBasedSelector(), new FixedClock(NOW), logger, bus);
}

describe("RunLogPublisher", () => {
  it("publishes an entry only after its row is stored", async () => {
    const runs = new SlowRuns();
    seed(runs, RUN_ID);
    const bus = new FakeBus();
    const received: RunLogEvent[] = [];
    new RunLogPublisher(bus).forRun(RUN_ID).subscribe((e) => received.push(e));

    const done = executor(runs, bus).execute(RUN_ID);
    await waitUntil(() => runs.pending.length === 1);
    expect(received).toEqual([]);
    expect(runs.entriesOf(RUN_ID)).toEqual([]);

    runs.pending.shift()?.();
    await waitUntil(() => received.length === 1);
    expect(received[0]).toBeInstanceOf(RunLogAppendedEvent);
    expect(runs.entriesOf(RUN_ID)).toHaveLength(1);

    while (!received.some((e) => e instanceof RunCompletedEvent)) {
      runs.pending.shift()?.();
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    await done;
    const seqs = received.flatMap((e) => (e instanceof RunLogAppendedEvent ? [e.entry.seq] : []));
    expect(seqs).toEqual(runs.entriesOf(RUN_ID).map((e) => e.seq));
    expect(received.at(-1)).toBeInstanceOf(RunCompletedEvent);
  });

  it("sends nothing to subscribers of another run", async () => {
    const runs = new InMemoryRuns();
    seed(runs, RUN_ID);
    const bus = new FakeBus();
    const received: RunLogEvent[] = [];
    new RunLogPublisher(bus).forRun(OTHER_RUN_ID).subscribe((e) => received.push(e));

    await executor(runs, bus).execute(RUN_ID);
    expect(runs.entriesOf(RUN_ID).length).toBeGreaterThan(0);
    expect(received).toEqual([]);
  });
});

async function waitUntil(condition: () => boolean): Promise<void> {
  for (let i = 0; i < 100 && !condition(); i += 1) await new Promise((resolve) => setTimeout(resolve, 0));
  if (!condition()) throw new Error("condition not met");
}
