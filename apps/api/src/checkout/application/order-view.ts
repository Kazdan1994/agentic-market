export interface OrderView {
  id: string;
  mandateId: string;
  runId: string | null;
  product: { id: string; name: string };
  merchant: { id: string; slug: string; name: string };
  unitPrice: { amountMinor: number; currency: string };
  quantity: 1;
  total: { amountMinor: number; currency: string };
  status: "paid_simulated";
  placedAt: string;
  placedBy: "builtin_agent" | "third_party_agent";
}

/** An order as the owner sees it, plus the ids needed to authorize access. */
export interface OrderReadRow {
  userId: string;
  view: OrderView;
}

export interface OrderReadModel {
  findById(orderId: string): Promise<OrderReadRow | null>;
  /** Newest first (FR-016). */
  listByUser(userId: string): Promise<OrderView[]>;
}

export const ORDER_READ_MODEL = Symbol("OrderReadModel");
