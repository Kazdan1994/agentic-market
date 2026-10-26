import { Injectable } from "@nestjs/common";
import { DataSource } from "typeorm";
import { tokenize } from "../../shared/domain/text-tokens";
import { Product } from "../domain/product";
import type { ProductRecord, ProductRepository, ProductSearchOptions } from "../domain/product-repository";
import { rankByRelevance } from "../domain/search-scoring";
import { CategoryEntity, MerchantEntity, ProductEntity } from "./catalog.entities";

interface JoinedRow {
  product: ProductEntity;
  merchant: MerchantEntity;
  category: CategoryEntity;
}

function toRecord({ product, merchant, category }: JoinedRow): ProductRecord {
  return {
    product: Product.create({ ...product, currency: product.currency.trim() }),
    merchant: { id: merchant.id, slug: merchant.slug, name: merchant.name },
    category: { id: category.id, slug: category.slug, name: category.name },
  };
}

/**
 * The demo catalog holds a few dozen products, so search scores them in memory with the
 * domain ranking (research R13). A larger catalog would need full-text search in SQL.
 */
@Injectable()
export class TypeOrmProductRepository implements ProductRepository {
  constructor(private readonly dataSource: DataSource) {}

  async search(query: string, { categorySlug, limit }: ProductSearchOptions): Promise<ProductRecord[]> {
    const tokens = tokenize(query);
    if (tokens.length === 0) return [];
    const rows = await this.load(categorySlug ? { categorySlug } : {});
    const candidates = rows.map((row) => ({
      row,
      id: row.product.id,
      name: row.product.name,
      description: row.product.description,
      categoryName: row.category.name,
      priceMinor: row.product.priceMinor,
      listedAt: row.product.listedAt,
    }));
    return rankByRelevance(tokens, candidates)
      .slice(0, limit)
      .map(({ candidate }) => toRecord(candidate.row));
  }

  async findById(productId: string): Promise<ProductRecord | null> {
    const [row] = await this.load({ productId });
    return row ? toRecord(row) : null;
  }

  private async load(filter: { categorySlug?: string; productId?: string }): Promise<JoinedRow[]> {
    const qb = this.dataSource
      .createQueryBuilder()
      .select(["p.*", "m.id AS m_id", "m.slug AS m_slug", "m.name AS m_name", "c.id AS c_id", "c.slug AS c_slug", "c.name AS c_name"])
      .from(ProductEntity, "p")
      .innerJoin(MerchantEntity, "m", "m.id = p.merchant_id")
      .innerJoin(CategoryEntity, "c", "c.id = p.category_id");
    if (filter.categorySlug) qb.andWhere("c.slug = :slug", { slug: filter.categorySlug });
    if (filter.productId) qb.andWhere("p.id = :id", { id: filter.productId });
    const raw: Record<string, unknown>[] = await qb.getRawMany();
    return raw.map((r) => ({
      product: {
        id: r.id as string,
        merchantId: r.merchant_id as string,
        categoryId: r.category_id as string,
        itemRef: r.item_ref as string,
        name: r.name as string,
        description: r.description as string,
        priceMinor: r.price_minor as number,
        currency: r.currency as string,
        stock: r.stock as number,
        listedAt: r.listed_at as Date,
      },
      merchant: { id: r.m_id as string, slug: r.m_slug as string, name: r.m_name as string },
      category: { id: r.c_id as string, slug: r.c_slug as string, name: r.c_name as string },
    }));
  }
}
