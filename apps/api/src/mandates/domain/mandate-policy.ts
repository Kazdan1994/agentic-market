import type { Money } from "../../shared/domain/money";
import type { Mandate } from "./mandate";

/** What the policy needs to know about a product. `catalog`'s Product satisfies it. */
export interface PurchasableProduct {
  categoryId: string;
  price: Money;
  isInStock(): boolean;
}

export type RefusalCode =
  | "MANDATE_REVOKED"
  | "MANDATE_EXPIRED"
  | "MANDATE_EXHAUSTED"
  | "CATEGORY_NOT_ALLOWED"
  | "OUT_OF_STOCK"
  | "PRICE_CHANGED"
  | "OVER_PER_PURCHASE_CAP"
  | "OVER_REMAINING_BUDGET";

export type Authorization = { allowed: true } | { allowed: false; code: RefusalCode };

const STATUS_REFUSAL = {
  revoked: "MANDATE_REVOKED",
  expired: "MANDATE_EXPIRED",
  exhausted: "MANDATE_EXHAUSTED",
} as const;

/** Decides whether a purchase fits a mandate. Returns the first failing rule (FR-008, FR-024). */
export class MandatePolicy {
  authorize(mandate: Mandate, product: PurchasableProduct, expectedPriceMinor: number, now: Date): Authorization {
    const status = mandate.status(now);
    if (status !== "active") return { allowed: false, code: STATUS_REFUSAL[status] };
    if (!mandate.allowsCategory(product.categoryId)) return { allowed: false, code: "CATEGORY_NOT_ALLOWED" };
    if (!product.isInStock()) return { allowed: false, code: "OUT_OF_STOCK" };

    const price = product.price.amountMinor;
    if (price !== expectedPriceMinor) return { allowed: false, code: "PRICE_CHANGED" };
    if (price > mandate.perPurchaseCapMinor) return { allowed: false, code: "OVER_PER_PURCHASE_CAP" };
    if (price > mandate.remainingMinor) return { allowed: false, code: "OVER_REMAINING_BUDGET" };
    return { allowed: true };
  }
}
