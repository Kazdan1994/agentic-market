import { randomUUID } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
import { DataSource, type EntityManager } from "typeorm";
import { CorrelationContext } from "../correlation/correlation-context";
import { ID_GENERATOR, type IdGenerator } from "../domain/id-generator";
import type { TransactionScope } from "../domain/transaction-scope";
import { AuditEventEntity } from "./audit-event.entity";
import type { AuditEventInput, AuditLog } from "./audit-log";

@Injectable()
export class TypeOrmAuditLog implements AuditLog {
  constructor(
    private readonly dataSource: DataSource,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
  ) {}

  async append(event: AuditEventInput, scope?: TransactionScope): Promise<void> {
    const manager = (scope as unknown as EntityManager | undefined) ?? this.dataSource.manager;
    await manager.insert(AuditEventEntity, {
      id: this.ids.next(),
      at: new Date(),
      actorType: event.actorType,
      actorId: event.actorId,
      mandateId: event.mandateId,
      type: event.type,
      payload: { ...event.payload },
      // Background work without a request still gets a traceable id.
      correlationId: CorrelationContext.current() ?? randomUUID(),
    });
  }
}
