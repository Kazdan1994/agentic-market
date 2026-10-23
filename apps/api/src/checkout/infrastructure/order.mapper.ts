import { Money } from "../../shared/domain/money";
import type { OrderRecord } from "../domain/order";
import type { OrderEntity } from "./checkout.entities";

export const OrderMapper = {
  toRow(order: OrderRecord): OrderEntity {
    return {
      id: order.id,
      userId: order.userId,
      mandateId: order.mandateId,
      merchantId: order.merchantId,
      productId: order.productId,
      runId: order.runId,
      keyId: order.keyId,
      paymentId: order.paymentId,
      productName: order.productName,
      merchantName: order.merchantName,
      unitPriceMinor: order.unitPrice.amountMinor,
      quantity: order.quantity,
      totalMinor: order.total.amountMinor,
      currency: order.total.currency,
      status: order.status,
      placedAt: order.placedAt,
    };
  },

  toDomain(row: OrderEntity): OrderRecord {
    const currency = row.currency.trim();
    return {
      id: row.id,
      userId: row.userId,
      mandateId: row.mandateId,
      merchantId: row.merchantId,
      productId: row.productId,
      runId: row.runId,
      keyId: row.keyId,
      paymentId: row.paymentId,
      productName: row.productName,
      merchantName: row.merchantName,
      unitPrice: Money.of(row.unitPriceMinor, currency),
      quantity: 1,
      total: Money.of(row.totalMinor, currency),
      status: row.status,
      placedAt: row.placedAt,
    };
  },
};
