import { Agent } from "../domain/agent";
import { Mandate } from "../domain/mandate";
import { MandateKey } from "../domain/mandate-key";
import type { AgentEntity } from "./agent.entity";
import type { MandateEntity } from "./mandate.entity";
import type { MandateKeyEntity } from "./mandate-key.entity";

export const MandateMapper = {
  toDomain(row: MandateEntity, categoryIds: readonly string[]): Mandate {
    return Mandate.restore({
      id: row.id,
      agentId: row.agentId,
      userId: row.userId,
      perPurchaseCapMinor: row.perPurchaseCapMinor,
      totalBudgetMinor: row.totalBudgetMinor,
      spentMinor: row.spentMinor,
      currency: row.currency,
      categoryIds,
      expiresAt: row.expiresAt,
      revokedAt: row.revokedAt,
      createdAt: row.createdAt,
    });
  },

  toRow(mandate: Mandate): MandateEntity {
    return {
      id: mandate.id,
      agentId: mandate.agentId,
      userId: mandate.userId,
      perPurchaseCapMinor: mandate.perPurchaseCapMinor,
      totalBudgetMinor: mandate.totalBudgetMinor,
      spentMinor: mandate.spentMinor,
      currency: mandate.currency,
      expiresAt: mandate.expiresAt,
      revokedAt: mandate.revokedAt,
      createdAt: mandate.createdAt,
    };
  },

  agentToRow(agent: Agent): AgentEntity {
    return { id: agent.id, userId: agent.userId, name: agent.name, createdAt: agent.createdAt };
  },

  agentToDomain(row: AgentEntity): Agent {
    return Agent.restore({ id: row.id, userId: row.userId, name: row.name, createdAt: row.createdAt });
  },

  keyToDomain(row: MandateKeyEntity): MandateKey {
    return MandateKey.restore({
      id: row.id,
      mandateId: row.mandateId,
      kind: row.kind,
      keyHash: row.keyHash,
      hint: row.hint,
      label: row.label,
      createdAt: row.createdAt,
      revokedAt: row.revokedAt,
    });
  },

  keyToRow(key: MandateKey): MandateKeyEntity {
    return {
      id: key.id,
      mandateId: key.mandateId,
      kind: key.kind,
      keyHash: key.keyHash,
      hint: key.hint,
      label: key.label,
      createdAt: key.createdAt,
      revokedAt: key.revokedAt,
    };
  },
};
