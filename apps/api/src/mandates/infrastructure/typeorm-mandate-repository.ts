import { Injectable } from "@nestjs/common";
import { DataSource, type EntityManager } from "typeorm";
import type { Agent } from "../domain/agent";
import type { Mandate } from "../domain/mandate";
import type { MandateKey } from "../domain/mandate-key";
import type { MandateRepository, MandateWithKey } from "../domain/mandate-repository";
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
