import { Injectable } from "@nestjs/common";
import { DataSource, type EntityManager } from "typeorm";
import { Product } from "../../catalog/domain/product";
import type { ProductRecord } from "../../catalog/domain/product-repository";
import { ProductEntity } from "../../catalog/infrastructure/catalog.entities";
import type { Mandate } from "../../mandates/domain/mandate";
import { MandateCategoryEntity, MandateEntity } from "../../mandates/infrastructure/mandate.entity";
import { MandateMapper } from "../../mandates/infrastructure/mandate.mapper";
import { TypeOrmAuditLog } from "../../shared/audit/typeorm-audit-log";
import type { TransactionScope } from "../../shared/domain/transaction-scope";
import { UuidV7Generator } from "../../shared/infrastructure/uuidv7-generator";
import type { CheckoutTx, CheckoutUnitOfWork } from "../domain/checkout-unit-of-work.port";
import type { OrderRecord } from "../domain/order";
import type { PaymentRecord } from "../domain/payment";
import { OrderEntity, PaymentEntity } from "./checkout.entities";
import { OrderMapper } from "./order.mapper";

interface LockedProductRow {
  id: string;
  merchant_id: string;
  category_id: string;
  item_ref: string;
  name: string;
  description: string;
  price_minor: number;
  currency: string;
  stock: number;
  listed_at: Date;
  m_slug: string;
  m_name: string;
  c_slug: string;
  c_name: string;
}

/**
 * One Postgres transaction per checkout. The mandate row is locked first, then the product
 * row, always in that order, so concurrent checkouts serialize without deadlocks (R12).
 */
@Injectable()
export class TypeOrmCheckoutUnitOfWork implements CheckoutUnitOfWork {
  private readonly auditLog: TypeOrmAuditLog;

  constructor(private readonly dataSource: DataSource) {
    this.auditLog = new TypeOrmAuditLog(dataSource, new UuidV7Generator());
  }

  run<T>(work: (tx: CheckoutTx) => Promise<T>): Promise<T> {
    return this.dataSource.transaction((manager) => work(this.tx(manager)));
  }

  private tx(manager: EntityManager): CheckoutTx {
    return {
      lockMandate: (mandateId) => this.lockMandate(manager, mandateId),
      lockProduct: (productId) => this.lockProduct(manager, productId),
      isRunningRun: async (runId, mandateId) => {
        const rows: unknown[] = await manager.query(
          "SELECT 1 FROM agent_runs WHERE id = $1 AND mandate_id = $2 AND status = 'running'",
          [runId, mandateId],
        );
        return rows.length === 1;
      },
      findPayment: async (mandateId, idempotencyKey) => {
        const row = await manager.findOneBy(PaymentEntity, { mandateId, idempotencyKey });
        return row ? toPayment(row) : null;
      },
      findOrderByPayment: async (paymentId) => {
        const row = await manager.findOneBy(OrderEntity, { paymentId });
        return row ? OrderMapper.toDomain(row) : null;
      },
      insertPayment: async (payment: PaymentRecord) => {
        await manager.insert(PaymentEntity, payment);
      },
      insertOrder: async (order: OrderRecord) => {
        await manager.insert(OrderEntity, OrderMapper.toRow(order));
      },
      updateSpent: async (mandateId, spentMinor) => {
        await manager.update(MandateEntity, { id: mandateId }, { spentMinor });
      },
      updateStock: async (productId, stock) => {
        await manager.update(ProductEntity, { id: productId }, { stock });
      },
      audit: (event) => this.auditLog.append(event, manager as unknown as TransactionScope),
    };
  }

  private async lockMandate(manager: EntityManager, mandateId: string): Promise<Mandate | null> {
    const row = await manager
      .createQueryBuilder(MandateEntity, "m")
      .setLock("pessimistic_write")
      .where("m.id = :mandateId", { mandateId })
      .getOne();
    if (!row) return null;
    const categories = await manager.findBy(MandateCategoryEntity, { mandateId });
    return MandateMapper.toDomain(
      row,
      categories.map((c) => c.categoryId),
    );
  }

  private async lockProduct(manager: EntityManager, productId: string): Promise<ProductRecord | null> {
    const rows: LockedProductRow[] = await manager.query(
      `SELECT p.*, m.slug AS m_slug, m.name AS m_name, c.slug AS c_slug, c.name AS c_name
       FROM products p
       JOIN merchants m ON m.id = p.merchant_id
       JOIN categories c ON c.id = p.category_id
       WHERE p.id = $1
       FOR UPDATE OF p`,
      [productId],
    );
    const [row] = rows;
    if (!row) return null;
    return {
      product: Product.create({
        id: row.id,
        merchantId: row.merchant_id,
        categoryId: row.category_id,
        itemRef: row.item_ref,
        name: row.name,
        description: row.description,
        priceMinor: row.price_minor,
        currency: row.currency.trim(),
        stock: row.stock,
        listedAt: row.listed_at,
      }),
      merchant: { id: row.merchant_id, slug: row.m_slug, name: row.m_name },
      category: { id: row.category_id, slug: row.c_slug, name: row.c_name },
    };
  }
}

function toPayment(row: PaymentEntity): PaymentRecord {
  return { ...row, currency: row.currency.trim() };
}
