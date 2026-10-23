import type { Agent } from "./agent";
import type { Mandate } from "./mandate";
import type { MandateKey } from "./mandate-key";

export interface MandateWithKey {
  mandate: Mandate;
  key: MandateKey;
}

export interface AgentWithMandate {
  agent: Agent;
  mandate: Mandate;
}

export interface MandateRepository {
  /** Agent, mandate, categories and built-in key, in one transaction. */
  create(agent: Agent, mandate: Mandate, builtinKey: MandateKey): Promise<void>;
  findById(mandateId: string): Promise<Mandate | null>;
  findByKeyHash(keyHash: Buffer): Promise<MandateWithKey | null>;
  /** The user's agents with their mandates, newest first. */
  listByUser(userId: string): Promise<AgentWithMandate[]>;
  findAgentById(agentId: string): Promise<AgentWithMandate | null>;
}

export const MANDATE_REPOSITORY = Symbol("MandateRepository");
