import { createHash } from "node:crypto";

export interface PaymentRecord {
  id: string;
  mandateId: string;
  keyId: string;
  idempotencyKey: string;
  /** SHA-256 of the request body, to detect a key reused for a different purchase. */
  requestHash: Buffer;
  productId: string;
  amountMinor: number;
  currency: string;
  outcome: "approved" | "declined";
  reference: string;
  createdAt: Date;
}

export function requestHashOf(productId: string, expectedPriceMinor: number): Buffer {
  return createHash("sha256").update(`${productId}:${expectedPriceMinor}`).digest();
}
