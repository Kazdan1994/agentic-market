import { describe, expect, it } from "vitest";
import { makeAgent, makeRun } from "@/test-utils";
import { heroSentence } from "./heroSentence";
import type { Agent } from "./useAgents";
import type { Run } from "@/features/runs/useRun";

const NOW = new Date("2026-10-26T15:20:00.000Z");

function agent(id: string, name: string, overrides: { status?: string; spent?: number; expiresAt?: string } = {}): Agent {
  const base = makeAgent({ id, name, status: overrides.status, spent: overrides.spent });
  return {
    ...base,
    mandate: { ...base.mandate, id: `m-${id}`, expiresAt: overrides.expiresAt ?? base.mandate.expiresAt },
  } as Agent;
}

const running = (mandateId: string) => new Map([[mandateId, { ...makeRun(), mandateId } as Run]]);

describe("heroSentence", () => {
  it("states what is left across the active mandates only", () => {
    const agents = [agent("a", "Pantry"), agent("b", "Coffee", { spent: 5000 }), agent("c", "Old", { status: "exhausted" })];
    expect(heroSentence(agents, new Map(), NOW)).toBe("250.00 EUR left to spend across 2 mandates.");
  });

  it("uses the singular for one mandate", () => {
    expect(heroSentence([agent("a", "Pantry")], new Map(), NOW)).toBe("150.00 EUR left to spend across 1 mandate.");
  });

  it("names the agent that is shopping now", () => {
    expect(heroSentence([agent("a", "Pantry")], running("m-a"), NOW)).toBe(
      "150.00 EUR left to spend across 1 mandate. Pantry is shopping now.",
    );
  });

  it("names a mandate ending within 7 days, rounding the days up", () => {
    const agents = [agent("a", "Gift", { expiresAt: "2026-10-31T20:00:00.000Z" })];
    expect(heroSentence(agents, new Map(), NOW)).toBe("150.00 EUR left to spend across 1 mandate. Gift ends in 6 days.");
  });

  it("puts the running agent before the ending mandate", () => {
    const agents = [agent("a", "Pantry"), agent("b", "Gift", { expiresAt: "2026-10-27T10:00:00.000Z" })];
    expect(heroSentence(agents, running("m-a"), NOW)).toBe(
      "300.00 EUR left to spend across 2 mandates. Pantry is shopping now. Gift ends in 1 day.",
    );
  });
});
