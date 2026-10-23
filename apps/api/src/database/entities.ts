import { AgentRunEntity } from "../agent/infrastructure/agent-run.entity";
import { RunLogEntryEntity } from "../agent/infrastructure/run-log-entry.entity";
import { CategoryEntity, MerchantEntity, ProductEntity } from "../catalog/infrastructure/catalog.entities";
import { OrderEntity, PaymentEntity } from "../checkout/infrastructure/checkout.entities";
import { UserEntity } from "../identity/infrastructure/user.entity";
import { AgentEntity } from "../mandates/infrastructure/agent.entity";
import { MandateActivityEntity } from "../mandates/infrastructure/mandate-activity.entity";
import { MandateCategoryEntity, MandateEntity } from "../mandates/infrastructure/mandate.entity";
import { MandateKeyEntity } from "../mandates/infrastructure/mandate-key.entity";
import { AuditEventEntity } from "../shared/audit/audit-event.entity";

/** Every TypeORM entity, registered explicitly. */
export const entities = [
  AuditEventEntity,
  UserEntity,
  MerchantEntity,
  CategoryEntity,
  ProductEntity,
  AgentEntity,
  MandateEntity,
  MandateCategoryEntity,
  MandateKeyEntity,
  MandateActivityEntity,
  PaymentEntity,
  OrderEntity,
  AgentRunEntity,
  RunLogEntryEntity,
];
