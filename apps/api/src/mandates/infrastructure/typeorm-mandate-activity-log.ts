import { randomUUID } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
import { DataSource } from "typeorm";
import { CorrelationContext } from "../../shared/correlation/correlation-context";
import { CLOCK, type Clock } from "../../shared/domain/clock";
import { ID_GENERATOR, type IdGenerator } from "../../shared/domain/id-generator";
import type { ActivityEntry, MandateActivityLog } from "../domain/mandate-activity-log";
import { MandateActivityEntity } from "./mandate-activity.entity";

@Injectable()
export class TypeOrmMandateActivityLog implements MandateActivityLog {
  constructor(
    private readonly dataSource: DataSource,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async append(entry: ActivityEntry): Promise<void> {
    await this.dataSource.getRepository(MandateActivityEntity).insert({
      id: this.ids.next(),
      mandateId: entry.mandateId,
      keyId: entry.keyId,
      at: this.clock.now(),
      action: entry.action,
      result: entry.result,
      detail: { ...entry.detail },
      correlationId: CorrelationContext.current() ?? randomUUID(),
    });
  }
}
