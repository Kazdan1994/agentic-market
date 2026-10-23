export type RunStep = "search" | "evaluation" | "selection" | "mandate_check" | "payment" | "outcome";

export interface RunLogInput {
  step: RunStep;
  message: string;
  productId: string | null;
  /** Structured detail for software clients (FR-021). */
  data: Readonly<Record<string, unknown>>;
}

export interface RunLogEntry extends RunLogInput {
  runId: string;
  /** 1, 2, 3… without gaps; doubles as the SSE event id. */
  seq: number;
  at: Date;
}

/** Hands out gap-free sequence numbers for one run's decision log (FR-017). */
export class RunLog {
  private constructor(
    readonly runId: string,
    readonly lastSeq: number,
  ) {
    Object.freeze(this);
  }

  static empty(runId: string): RunLog {
    return new RunLog(runId, 0);
  }

  static resume(runId: string, lastSeq: number): RunLog {
    if (!Number.isSafeInteger(lastSeq) || lastSeq < 0) throw new RangeError(`Invalid last seq ${lastSeq}`);
    return new RunLog(runId, lastSeq);
  }

  append(input: RunLogInput, at: Date): { log: RunLog; entry: RunLogEntry } {
    const seq = this.lastSeq + 1;
    return { log: new RunLog(this.runId, seq), entry: { ...input, runId: this.runId, seq, at } };
  }
}
