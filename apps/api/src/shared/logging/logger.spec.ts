import { Writable } from "node:stream";
import pino from "pino";
import { describe, expect, it } from "vitest";
import { CorrelationContext } from "../correlation/correlation-context";
import { buildPinoOptions } from "./logger.options";

function capture() {
  const lines: Record<string, unknown>[] = [];
  const stream = new Writable({
    write(chunk, _enc, done) {
      lines.push(JSON.parse(chunk.toString()) as Record<string, unknown>);
      done();
    },
  });
  return { logger: pino(buildPinoOptions(), stream), lines };
}

describe("logger options", () => {
  it("redacts credentials, cookies, passwords and mandate keys", () => {
    const { logger, lines } = capture();
    logger.info(
      {
        req: { headers: { authorization: "Bearer amk_secretvalue", cookie: "am_session=abc" } },
        body: { password: "hunter2" },
        note: "used key amk_AbC-123_xyz in a call",
      },
      "request",
    );
    const text = JSON.stringify(lines[0]);
    expect(text).not.toContain("amk_secretvalue");
    expect(text).not.toContain("am_session=abc");
    expect(text).not.toContain("hunter2");
    expect(text).not.toContain("amk_AbC-123_xyz");
  });

  it("adds the current correlation id to every line", async () => {
    const { logger, lines } = capture();
    const id = "3f2a1b0c-9d8e-4f7a-8b6c-5d4e3f2a1b0c";
    await CorrelationContext.run(id, async () => logger.info("inside"));
    expect(lines[0]?.correlationId).toBe(id);
  });
});
