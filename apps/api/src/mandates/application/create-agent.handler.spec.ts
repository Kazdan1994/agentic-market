import { describe, expect, it } from "vitest";
import type { Category, CategoryRepository } from "../../catalog/domain/category";
import type { AuditEventInput, AuditLog } from "../../shared/audit/audit-log";
import { DomainError } from "../../shared/errors/domain-error";
import { FixedClock } from "../../../test/support/fixed-clock";
import { SequentialIds } from "../../../test/support/sequential-ids";
import type { Agent } from "../domain/agent";
import type { Mandate } from "../domain/mandate";
import { type MandateKey, MandateKeySecrets } from "../domain/mandate-key";
import type { AgentWithMandate, MandateRepository, MandateWithKey } from "../domain/mandate-repository";
import { CreateAgentCommand, CreateAgentHandler } from "./create-agent.handler";

const NOW = new Date("2026-10-23T12:00:00Z");
const ALICE = "01900000-0000-7000-8000-00000000a11c";
const BUILTIN_SECRET = "b".repeat(32);
const AUDIO: Category = { id: "00000000-0000-7000-8000-0000000000c1", slug: "audio", name: "Audio" };

class InMemoryMandates implements MandateRepository {
  readonly created: { agent: Agent; mandate: Mandate; key: MandateKey }[] = [];
  async create(agent: Agent, mandate: Mandate, key: MandateKey) {
    this.created.push({ agent, mandate, key });
  }
  async findById(): Promise<Mandate | null> {
    return null;
  }
  async findByKeyHash(): Promise<MandateWithKey | null> {
    return null;
  }
  async listByUser(): Promise<AgentWithMandate[]> {
    return [];
  }
  async findAgentById(): Promise<AgentWithMandate | null> {
    return null;
  }
}

const categories: CategoryRepository = { listAll: async () => [AUDIO] };

function setup() {
  const mandates = new InMemoryMandates();
  const audit: AuditEventInput[] = [];
  const auditLog: AuditLog = { append: async (event) => void audit.push(event) };
  const handler = new CreateAgentHandler(
    mandates,
    categories,
    auditLog,
    new FixedClock(NOW),
    new SequentialIds(),
    { BUILTIN_KEY_SECRET: BUILTIN_SECRET },
  );
  return { handler, mandates, audit };
}

const command = (categorySlugs = ["audio"]) =>
  new CreateAgentCommand(ALICE, "Runner", 10_000, 15_000, categorySlugs, new Date("2026-10-24T12:00:00Z"));

describe("CreateAgentHandler", () => {
  it("creates the agent, an active mandate and one built-in key, and audits it", async () => {
    const { handler, mandates, audit } = setup();
    const view = await handler.execute(command());

    expect(mandates.created).toHaveLength(1);
    const [{ agent, mandate, key }] = mandates.created as [(typeof mandates.created)[number]];
    expect(agent.userId).toBe(ALICE);
    expect(mandate.spentMinor).toBe(0);
    expect(mandate.status(NOW)).toBe("active");
    expect(mandate.categoryIds).toEqual([AUDIO.id]);
    expect(key.kind).toBe("builtin");
    expect(key.keyHash).toEqual(MandateKeySecrets.deriveBuiltin(BUILTIN_SECRET, mandate.id).keyHash);

    expect(audit).toEqual([
      expect.objectContaining({ type: "mandate.created", actorType: "user", actorId: ALICE, mandateId: mandate.id }),
    ]);
    expect(view.mandate.status).toBe("active");
    expect(view.mandate.remaining).toEqual({ amountMinor: 15_000, currency: "EUR" });
    expect(view.mandate.categories).toEqual([{ slug: "audio", name: "Audio" }]);
  });

  it("rejects unknown category slugs, naming them", async () => {
    const { handler, mandates } = setup();
    const error = await handler.execute(command(["audio", "toys"])).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(DomainError);
    expect((error as DomainError).code).toBe("VALIDATION_FAILED");
    expect((error as DomainError).details).toEqual({ categorySlugs: ["toys"] });
    expect(mandates.created).toHaveLength(0);
  });
});
