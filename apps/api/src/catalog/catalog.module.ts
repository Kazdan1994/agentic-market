import { forwardRef, Module } from "@nestjs/common";
import { IdentityModule } from "../identity/identity.module";
import { MandatesModule } from "../mandates/mandates.module";
import { GetProductHandler } from "./application/get-product.handler";
import { SearchCatalogHandler } from "./application/search-catalog.handler";
import { ListCategoriesHandler } from "./application/list-categories.handler";
import { CATEGORY_REPOSITORY } from "./domain/category";
import { PRODUCT_REPOSITORY } from "./domain/product-repository";
import { CatalogController } from "./infrastructure/http/catalog.controller";
import { CategoriesController } from "./infrastructure/http/categories.controller";
import { TypeOrmCategoryRepository } from "./infrastructure/typeorm-category-repository";
import { TypeOrmProductRepository } from "./infrastructure/typeorm-product-repository";

@Module({
  // Mandates needs categories; catalog needs the key guard and mandates for eligibility.
  imports: [IdentityModule, forwardRef(() => MandatesModule)],
  controllers: [CategoriesController, CatalogController],
  providers: [
    ListCategoriesHandler,
    SearchCatalogHandler,
    GetProductHandler,
    { provide: CATEGORY_REPOSITORY, useClass: TypeOrmCategoryRepository },
    { provide: PRODUCT_REPOSITORY, useClass: TypeOrmProductRepository },
  ],
  exports: [CATEGORY_REPOSITORY, PRODUCT_REPOSITORY],
})
export class CatalogModule {}
