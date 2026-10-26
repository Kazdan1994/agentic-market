import type { Money } from "../../shared/domain/money";

/** A paid purchase. Product, merchant and price are snapshots taken at checkout (FR-014). */
export interface OrderRecord {
  id: string;
  userId: string;
  mandateId: string;
  merchantId: string;
  productId: string;
  runId: string | null;
  keyId: string;
  paymentId: string;
  productName: string;
  merchantName: string;
  unitPrice: Money;
  quantity: 1;
  total: Money;
  status: "paid_simulated";
  placedAt: Date;
}
