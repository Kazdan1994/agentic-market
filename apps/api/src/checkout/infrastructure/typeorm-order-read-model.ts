import { Injectable } from "@nestjs/common";
import { DataSource } from "typeorm";
import type { OrderReadModel, OrderReadRow, OrderView } from "../application/order-view";

interface Row {
  id: string;
  user_id: string;
  mandate_id: string;
  run_id: string | null;
  product_id: string;
  product_name: string;
  merchant_id: string;
  merchant_slug: string;
  merchant_name: string;
  unit_price_minor: number;
  total_minor: number;
  currency: string;
  placed_at: Date;
  key_kind: "builtin" | "external";
}

const SELECT = `
  SELECT o.id, o.user_id, o.mandate_id, o.run_id, o.product_id, o.product_name,
         o.merchant_id, m.slug AS merchant_slug, o.merchant_name,
         o.unit_price_minor, o.total_minor, o.currency, o.placed_at, k.kind AS key_kind
  FROM orders o
  JOIN merchants m ON m.id = o.merchant_id
  JOIN mandate_keys k ON k.id = o.key_id`;

function toView(row: Row): OrderView {
  const currency = row.currency.trim();
  return {
    id: row.id,
    mandateId: row.mandate_id,
    runId: row.run_id,
    product: { id: row.product_id, name: row.product_name },
    // The name is the snapshot taken at purchase; the slug identifies the merchant.
    merchant: { id: row.merchant_id, slug: row.merchant_slug, name: row.merchant_name },
    unitPrice: { amountMinor: row.unit_price_minor, currency },
    quantity: 1,
    total: { amountMinor: row.total_minor, currency },
    status: "paid_simulated",
    placedAt: row.placed_at.toISOString(),
    placedBy: row.key_kind === "builtin" ? "builtin_agent" : "third_party_agent",
  };
}

@Injectable()
export class TypeOrmOrderReadModel implements OrderReadModel {
  constructor(private readonly dataSource: DataSource) {}

  async findById(orderId: string): Promise<OrderReadRow | null> {
    const [row]: Row[] = await this.dataSource.query(`${SELECT} WHERE o.id = $1`, [orderId]);
    return row ? { userId: row.user_id, view: toView(row) } : null;
  }

  async listByUser(userId: string): Promise<OrderView[]> {
    const rows: Row[] = await this.dataSource.query(
      `${SELECT} WHERE o.user_id = $1 ORDER BY o.placed_at DESC, o.id DESC`,
      [userId],
    );
    return rows.map(toView);
  }
}
