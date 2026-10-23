import { Inject } from "@nestjs/common";
import { type IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { DomainError } from "../../shared/errors/domain-error";
import { ErrorCode } from "../../shared/errors/error-codes";
import { PRODUCT_REPOSITORY, type ProductRepository } from "../domain/product-repository";
import { type ProductView, toProductView } from "./product-view";

export class GetProductQuery {
  constructor(readonly productId: string) {}
}

@QueryHandler(GetProductQuery)
export class GetProductHandler implements IQueryHandler<GetProductQuery, ProductView> {
  constructor(@Inject(PRODUCT_REPOSITORY) private readonly products: ProductRepository) {}

  async execute({ productId }: GetProductQuery): Promise<ProductView> {
    const record = await this.products.findById(productId);
    if (!record) throw new DomainError(ErrorCode.NOT_FOUND, "Product not found.");
    return toProductView(record);
  }
}
