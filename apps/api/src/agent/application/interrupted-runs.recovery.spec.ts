import { describe, expect, it } from "vitest";
import type { AuditEventInput } from "../../shared/audit/audit-log";
import { FixedClock } from "../../../test/support/fixed-clock";
import { InMemoryRuns } from "../../../test/support/in-memory-runs";
import { RunLog } from "../domain/run-log-entry";
import { InterruptedRunsRecovery } from "./interrupted-runs.recovery";

describe("InterruptedRunsRecovery", () => {
  it("closes every running run as interrupted, with a final log entry and an audit event", async () => {
    const runs = new InMemoryRuns();
    const audit: AuditEventInput[] = [];
    const started = new Date("2026-10-23T11:59:00Z");
    const run = runs.seedRunning({
      id: "00000000-0000-7000-8000-000000000101",
      mandateId: "00000000-0000-7000-8000-0000000000b1",
      userId: "01900000-0000-7000-8000-00000000a11c",
      request: "wireless earbuds",
      correlationId: "00000000-0000-7000-8000-0000000000cc",
      now: started,
    });
    await runs.appendLog(RunLog.empty(run.id).append({ step: "search", message: "searched", productId: null, data: {} }, started).entry);

    await new InterruptedRunsRecovery(runs, { append: async (e) => void audit.push(e) }, new FixedClock(new Date("2026-10-23T12:00:00Z"))).onApplicationBootstrap();

    expect(await runs.findById(run.id)).toMatchObject({ status: "completed", outcome: "interrupted" });
    expect(runs.entriesOf(run.id).map((e) => [e.seq, e.step])).toEqual([
      [1, "search"],
      [2, "outcome"],
    ]);
    expect(audit).toEqual([expect.objectContaining({ type: "run.interrupted", actorType: "system", mandateId: run.mandateId })]);
  });
});
