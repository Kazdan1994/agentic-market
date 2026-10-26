import { Inject } from "@nestjs/common";
import { type IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { MANDATE_REPOSITORY, type MandateRepository } from "../../mandates/domain/mandate-repository";
import { DomainError } from "../../shared/errors/domain-error";
import { ErrorCode } from "../../shared/errors/error-codes";
import { eligibilityOf } from "../domain/eligibility";
import { PRODUCT_REPOSITORY, type ProductRepository } from "../domain/product-repository";
import { type SearchResultView, toProductView } from "./product-view";

export class SearchCatalogQuery {
  constructor(
    readonly mandateId: string,
    readonly query: string,
    readonly categorySlug: string | undefined,
    readonly limit: number,
  ) {}
}

/** Searches every merchant; results are not filtered by the mandate, only annotated. */
@QueryHandler(SearchCatalogQuery)
export class SearchCatalogHandler implements IQueryHandler<SearchCatalogQuery, SearchResultView[]> {
  constructor(
    @Inject(PRODUCT_REPOSITORY) private readonly products: ProductRepository,
    @Inject(MANDATE_REPOSITORY) private readonly mandates: MandateRepository,
  ) {}

  async execute({ mandateId, query, categorySlug, limit }: SearchCatalogQuery): Promise<SearchResultView[]> {
    const mandate = await this.mandates.findById(mandateId);
    if (!mandate) throw new DomainError(ErrorCode.NOT_FOUND, "Mandate not found.");
    const records = await this.products.search(query, { categorySlug, limit });
    return records.map((record) => ({
      ...toProductView(record),
      eligibility: eligibilityOf(mandate, {
        categoryId: record.product.categoryId,
        priceMinor: record.product.price.amountMinor,
        stock: record.product.stock,
      }),
    }));
  }
}
