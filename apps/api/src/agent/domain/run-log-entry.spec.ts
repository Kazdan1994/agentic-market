import { describe, expect, it } from "vitest";
import { RunLog } from "./run-log-entry";

describe("RunLog", () => {
  it("numbers entries 1, 2, 3 without gaps", () => {
    const at = new Date("2026-10-23T12:00:00Z");
    let log = RunLog.empty("00000000-0000-7000-8000-000000000001");
    const seqs: number[] = [];
    for (const step of ["search", "evaluation", "selection"] as const) {
      const appended = log.append({ step, message: step, productId: null, data: {} }, at);
      seqs.push(appended.entry.seq);
      log = appended.log;
    }
    expect(seqs).toEqual([1, 2, 3]);
    expect(log.lastSeq).toBe(3);
  });

  it("continues from a stored sequence", () => {
    const appended = RunLog.resume("00000000-0000-7000-8000-000000000001", 7).append(
      { step: "outcome", message: "done", productId: null, data: {} },
      new Date(),
    );
    expect(appended.entry.seq).toBe(8);
  });
});
