import { beforeEach, describe, expect, it } from "vitest";
import type { MandateRepository } from "../../mandates/domain/mandate-repository";
import type { Mandate } from "../../mandates/domain/mandate";
import type { AuditEventInput } from "../../shared/audit/audit-log";
import { DomainError } from "../../shared/errors/domain-error";
import { FixedClock } from "../../../test/support/fixed-clock";
import { InMemoryRuns } from "../../../test/support/in-memory-runs";
import { testMandate } from "../../../test/support/mandates";
import { SequentialIds } from "../../../test/support/sequential-ids";
import { RunStartedEvent } from "./run-started.event";
import { StartRunCommand, StartRunHandler } from "./start-run.handler";

const ALICE = "01900000-0000-7000-8000-00000000a11c";
const BOB = "01900000-0000-7000-8000-000000000b0b";
const NOW = new Date("2026-10-23T12:00:00Z");

let mandate: Mandate;
let runs: InMemoryRuns;
let audit: AuditEventInput[];
let published: unknown[];

function handler() {
  const mandates = { findById: async (id: string) => (id === mandate.id ? mandate : null) } as unknown as MandateRepository;
  return new StartRunHandler(
    mandates,
    runs,
    { append: async (e) => void audit.push(e) },
    new FixedClock(NOW),
    new SequentialIds(),
    { publish: (event: unknown) => void published.push(event) },
  );
}

const command = (over: Partial<StartRunCommand> = {}) =>
  Object.assign(new StartRunCommand(ALICE, testMandate().id, "wireless headphones for running", "00000000-0000-7000-8000-0000000000cc"), over);

async function failure(promise: Promise<unknown>): Promise<DomainError> {
  const error = await promise.catch((e: unknown) => e);
  if (!(error instanceof DomainError)) throw new Error(`expected DomainError, got ${String(error)}`);
  return error;
}

describe("StartRunHandler", () => {
  beforeEach(() => {
    mandate = testMandate();
    runs = new InMemoryRuns();
    audit = [];
    published = [];
  });

  it("inserts a running run and publishes RunStartedEvent", async () => {
    const run = await handler().execute(command());
    expect(run.status).toBe("running");
    expect(await runs.findById(run.id)).toBe(run);
    expect(published).toEqual([new RunStartedEvent(run.id)]);
  });

  it.each([
    [{ revokedAt: NOW }, "MANDATE_REVOKED"],
    [{ expiresAt: NOW }, "MANDATE_EXPIRED"],
    [{ spentMinor: 15_000 }, "MANDATE_EXHAUSTED"],
  ] as const)("refuses an inactive mandate %o with %s and audits it", async (over, code) => {
    mandate = testMandate(over);
    const error = await failure(handler().execute(command()));
    expect(error.code).toBe(code);
    expect(runs.runs.size).toBe(0);
    expect(audit).toEqual([expect.objectContaining({ type: "mandate.check.refused", actorType: "user", payload: expect.objectContaining({ code }) })]);
  });

  it('tells users an exhausted mandate has its "Budget used up"', async () => {
    mandate = testMandate({ spentMinor: 15_000 });
    expect((await failure(handler().execute(command()))).message).toBe("Budget used up.");
  });

  it("refuses a second run while one is running", async () => {
    await handler().execute(command());
    expect((await failure(handler().execute(command()))).code).toBe("RUN_ALREADY_IN_PROGRESS");
  });

  it.each(["ab", "x".repeat(501), "the of and"])("refuses request %j with INVALID_REQUEST and creates no run", async (request) => {
    expect((await failure(handler().execute(command({ request })))).code).toBe("INVALID_REQUEST");
    expect(runs.runs.size).toBe(0);
  });

  it("hides other users' mandates", async () => {
    expect((await failure(handler().execute(command({ userId: BOB })))).code).toBe("NOT_FOUND");
  });
});
