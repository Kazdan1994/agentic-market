import { Injectable } from "@nestjs/common";
import { DataSource, type EntityManager, In } from "typeorm";
import type { Agent } from "../domain/agent";
import type { Mandate } from "../domain/mandate";
import type { MandateKey } from "../domain/mandate-key";
import type { AgentWithMandate, MandateRepository, MandateWithKey } from "../domain/mandate-repository";
import { AgentEntity } from "./agent.entity";
import { MandateCategoryEntity, MandateEntity } from "./mandate.entity";
import { MandateKeyEntity } from "./mandate-key.entity";
import { MandateMapper } from "./mandate.mapper";

@Injectable()
export class TypeOrmMandateRepository implements MandateRepository {
  constructor(private readonly dataSource: DataSource) {}

  async create(agent: Agent, mandate: Mandate, builtinKey: MandateKey): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      await manager.insert(AgentEntity, MandateMapper.agentToRow(agent));
      await manager.insert(MandateEntity, MandateMapper.toRow(mandate));
      await manager.insert(
        MandateCategoryEntity,
        mandate.categoryIds.map((categoryId) => ({ mandateId: mandate.id, categoryId })),
      );
      await manager.insert(MandateKeyEntity, MandateMapper.keyToRow(builtinKey));
    });
  }

  async findById(mandateId: string): Promise<Mandate | null> {
    return this.load(this.dataSource.manager, mandateId);
  }

  async findByKeyHash(keyHash: Buffer): Promise<MandateWithKey | null> {
    const keyRow = await this.dataSource.getRepository(MandateKeyEntity).findOneBy({ keyHash });
    if (!keyRow) return null;
    const mandate = await this.load(this.dataSource.manager, keyRow.mandateId);
    if (!mandate) return null;
    return { mandate, key: MandateMapper.keyToDomain(keyRow) };
  }

  async listByUser(userId: string): Promise<AgentWithMandate[]> {
    const agents = await this.dataSource
      .getRepository(AgentEntity)
      .find({ where: { userId }, order: { createdAt: "DESC", id: "DESC" } });
    return this.withMandates(agents);
  }

  async findAgentById(agentId: string): Promise<AgentWithMandate | null> {
    const agent = await this.dataSource.getRepository(AgentEntity).findOneBy({ id: agentId });
    if (!agent) return null;
    const [found] = await this.withMandates([agent]);
    return found ?? null;
  }

  private async withMandates(agents: AgentEntity[]): Promise<AgentWithMandate[]> {
    if (agents.length === 0) return [];
    const manager = this.dataSource.manager;
    const mandates = await manager.findBy(MandateEntity, { agentId: In(agents.map((a) => a.id)) });
    const categories = await manager.findBy(MandateCategoryEntity, { mandateId: In(mandates.map((m) => m.id)) });
    const mandateByAgent = new Map(mandates.map((m) => [m.agentId, m]));
    return agents.flatMap((agentRow) => {
      const mandateRow = mandateByAgent.get(agentRow.id);
      if (!mandateRow) return [];
      const categoryIds = categories.filter((c) => c.mandateId === mandateRow.id).map((c) => c.categoryId);
      return [
        { agent: MandateMapper.agentToDomain(agentRow), mandate: MandateMapper.toDomain(mandateRow, categoryIds) },
      ];
    });
  }

  private async load(manager: EntityManager, mandateId: string): Promise<Mandate | null> {
    const row = await manager.findOneBy(MandateEntity, { id: mandateId });
    if (!row) return null;
    const categories = await manager.findBy(MandateCategoryEntity, { mandateId });
    return MandateMapper.toDomain(
      row,
      categories.map((c) => c.categoryId),
    );
  }
}
