import type { Product } from "./product";

export interface MerchantRef {
  id: string;
  slug: string;
  name: string;
}

export interface CategoryRef {
  id: string;
  slug: string;
  name: string;
}

/** A product with its merchant and category, as agents see it (FR-025b). */
export interface ProductRecord {
  product: Product;
  merchant: MerchantRef;
  category: CategoryRef;
}

export interface ProductSearchOptions {
  categorySlug?: string;
  limit: number;
}

export interface ProductRepository {
  /** Ranked by `rankByRelevance`; products with no matching word are left out. */
  search(query: string, options: ProductSearchOptions): Promise<ProductRecord[]>;
  findById(productId: string): Promise<ProductRecord | null>;
}

export const PRODUCT_REPOSITORY = Symbol("ProductRepository");
