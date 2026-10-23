import { CategoryEntity, MerchantEntity, ProductEntity } from "../catalog/infrastructure/catalog.entities";
import { UserEntity } from "../identity/infrastructure/user.entity";
import { AuditEventEntity } from "../shared/audit/audit-event.entity";

/** Every TypeORM entity, registered explicitly. */
export const entities = [AuditEventEntity, UserEntity, MerchantEntity, CategoryEntity, ProductEntity];
