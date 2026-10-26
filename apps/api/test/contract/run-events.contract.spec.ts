import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { seedCatalog } from "../../src/database/seed/seed-catalog";
import { seedUsers } from "../../src/database/seed/seed-users";
import { Argon2PasswordHasher } from "../../src/identity/infrastructure/argon2-password-hasher";
import { createAgent } from "../support/agents";
import { createTestApp, type TestApp } from "../support/app";
import { expectResponse } from "../support/openapi-contract";
import { getTestDataSource, truncateAll } from "../support/postgres";
import { DEMO_PASSWORD, loginAs } from "../support/session";

interface SseEvent {
  id?: string;
  event?: string;
  data: unknown;
  /** Local clock when the event was parsed. */
  receivedAt: number;
}

/** Reads an SSE stream until the server closes it (or 30 s), parsing events and ignoring comments. */
async function readStream(url: string, cookie: string, lastEventId?: string): Promise<{ status: number; events: SseEvent[] }> {
  const headers: Record<string, string> = { Cookie: cookie, Accept: "text/event-stream" };
  if (lastEventId !== undefined) headers["Last-Event-ID"] = lastEventId;
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(30_000) });
  if (res.status !== 200 || !res.body) return { status: res.status, events: [] };
  expect(res.headers.get("content-type")).toMatch(/^text\/event-stream/);
  const events: SseEvent[] = [];
  const decoder = new TextDecoder();
  let buffer = "";
  for await (const chunk of res.body) {
    buffer += decoder.decode(chunk as Uint8Array, { stream: true });
    let end = buffer.indexOf("\n\n");
    while (end >= 0) {
      const block = buffer.slice(0, end);
      buffer = buffer.slice(end + 2);
      const fields = Object.fromEntries(
        block
          .split("\n")
          .filter((line) => line && !line.startsWith(":"))
          .map((line) => [line.slice(0, line.indexOf(":")), line.slice(line.indexOf(":") + 1).trimStart()]),
      );
      if (fields.data !== undefined) {
        events.push({ id: fields.id, event: fields.event, data: JSON.parse(fields.data), receivedAt: Date.now() });
      }
      end = buffer.indexOf("\n\n");
    }
  }
  return { status: res.status, events };
}

const logSeqs = (events: SseEvent[]) => events.filter((e) => e.event === "log").map((e) => Number(e.id));

describe("run event stream (contract)", () => {
  let testApp: TestApp;
  let alice: string;
  let bob: string;

  const events = (runId: string, cookie = alice, lastEventId?: string) =>
    readStream(`${testApp.baseUrl}/v1/runs/${runId}/events`, cookie, lastEventId);

  async function startRun(mandateId: string): Promise<string> {
    const res = await request(testApp.baseUrl)
      .post(`/v1/mandates/${mandateId}/runs`)
      .set("Cookie", alice)
      .send({ request: "wireless running earbuds" })
      .expect(202);
    return res.body.id as string;
  }

  beforeAll(async () => {
    await truncateAll();
    const ds = await getTestDataSource();
    await seedUsers(ds, new Argon2PasswordHasher(), DEMO_PASSWORD);
    await seedCatalog(ds);
    testApp = await createTestApp();
    alice = await loginAs(testApp.baseUrl, "alice@demo.local");
    bob = await loginAs(testApp.baseUrl, "bob@demo.local");
  });
  afterAll(async () => testApp.close());

  it("streams entries 1…n in order during a run, then run.completed, each within 1 s of its row", async () => {
    const { mandateId } = await createAgent(testApp.baseUrl, alice);
    const runId = await startRun(mandateId);
    const { status, events: received } = await events(runId);

    expect(status).toBe(200);
    const seqs = logSeqs(received);
    expect(seqs.length).toBeGreaterThan(2);
    expect(seqs).toEqual(seqs.map((_, index) => index + 1));
    const completed = received.at(-1);
    expect(completed?.event).toBe("run.completed");
    expectResponse("getRun", 200, completed?.data);
    expect(completed?.data).toMatchObject({ id: runId, status: "completed", outcome: "order_placed" });

    for (const event of received.filter((e) => e.event === "log")) {
      const writtenAt = Date.parse((event.data as { at: string }).at);
      expect(event.receivedAt - writtenAt).toBeLessThan(1_000);
    }
  });

  it("replays only the entries after Last-Event-ID on reconnect", async () => {
    const { mandateId } = await createAgent(testApp.baseUrl, alice);
    const runId = await startRun(mandateId);
    const all = logSeqs((await events(runId)).events);

    const { events: resumed } = await events(runId, alice, "3");
    expect(logSeqs(resumed)).toEqual(all.filter((seq) => seq > 3));
    expect(resumed.at(-1)?.event).toBe("run.completed");
  });

  it("replays a completed run in full, then run.completed, then closes", async () => {
    const { mandateId } = await createAgent(testApp.baseUrl, alice);
    const runId = await startRun(mandateId);
    await events(runId);

    const log = await request(testApp.baseUrl).get(`/v1/runs/${runId}/log`).set("Cookie", alice).expect(200);
    const { events: replay } = await events(runId);
    expect(replay.filter((e) => e.event === "log").map((e) => e.data)).toEqual(log.body);
    expect(replay.map((e) => e.event).at(-1)).toBe("run.completed");
    expect(replay.filter((e) => e.event === "run.completed")).toHaveLength(1);
  });

  it("returns 404 for another user's run before the stream opens", async () => {
    const { mandateId } = await createAgent(testApp.baseUrl, alice);
    const runId = await startRun(mandateId);
    await events(runId);

    const res = await request(testApp.baseUrl).get(`/v1/runs/${runId}/events`).set("Cookie", bob).expect(404);
    expect(res.headers["content-type"]).toMatch(/json/);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });
});
