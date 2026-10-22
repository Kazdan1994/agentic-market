import { describe, expect, it, vi } from "vitest";
import { CorrelationContext } from "./correlation-context";
import { CorrelationMiddleware, CORRELATION_HEADER } from "./correlation.middleware";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function run(headerValue?: string) {
  const req = { headers: headerValue ? { [CORRELATION_HEADER]: headerValue } : {} };
  const setHeader = vi.fn();
  let seenInside: string | undefined;
  return new Promise<{ setHeader: typeof setHeader; seenInside?: string }>((resolve) => {
    new CorrelationMiddleware().use(req as never, { setHeader } as never, async () => {
      await Promise.resolve();
      seenInside = CorrelationContext.current();
      resolve({ setHeader, seenInside });
    });
  });
}

describe("correlation", () => {
  it("keeps a valid incoming X-Correlation-Id and echoes it", async () => {
    const id = "0b9a3f7e-6f1a-4c57-9a8d-2f4f3f9c1e11";
    const { setHeader, seenInside } = await run(id);
    expect(setHeader).toHaveBeenCalledWith("X-Correlation-Id", id);
    expect(seenInside).toBe(id);
  });

  it("generates a uuid when the header is missing or not a uuid", async () => {
    for (const header of [undefined, "not-a-uuid"]) {
      const { setHeader, seenInside } = await run(header);
      expect(seenInside).toMatch(UUID);
      expect(seenInside).not.toBe(header);
      expect(setHeader).toHaveBeenCalledWith("X-Correlation-Id", seenInside);
    }
  });

  it("is undefined outside a request", () => {
    expect(CorrelationContext.current()).toBeUndefined();
  });

  it("runs code with an explicit correlation id", async () => {
    const id = "7d3c1c2e-1f6b-4a3f-8c8e-0a1b2c3d4e5f";
    const seen = await CorrelationContext.run(id, async () => {
      await Promise.resolve();
      return CorrelationContext.current();
    });
    expect(seen).toBe(id);
  });
});
