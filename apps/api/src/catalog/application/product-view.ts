import type { Eligibility } from "../domain/eligibility";
import type { ProductRecord } from "../domain/product-repository";

export interface ProductView {
  id: string;
  itemRef: string;
  name: string;
  description: string;
  category: { slug: string; name: string };
  merchant: { id: string; slug: string; name: string };
  price: { amountMinor: number; currency: string };
  stock: number;
  listedAt: string;
}

export type SearchResultView = ProductView & { eligibility: Eligibility };

/** Shapes a product like the `Product` schema in contracts/openapi.yaml. */
export function toProductView({ product, merchant, category }: ProductRecord): ProductView {
  return {
    id: product.id,
    itemRef: product.itemRef,
    name: product.name,
    description: product.description,
    category: { slug: category.slug, name: category.name },
    merchant,
    price: { amountMinor: product.price.amountMinor, currency: product.price.currency },
    stock: product.stock,
    listedAt: product.listedAt.toISOString(),
  };
}
