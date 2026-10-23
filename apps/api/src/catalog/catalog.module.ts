import { Module } from "@nestjs/common";
import { IdentityModule } from "../identity/identity.module";
import { ListCategoriesHandler } from "./application/list-categories.handler";
import { CATEGORY_REPOSITORY } from "./domain/category";
import { CategoriesController } from "./infrastructure/http/categories.controller";
import { TypeOrmCategoryRepository } from "./infrastructure/typeorm-category-repository";

@Module({
  imports: [IdentityModule],
  controllers: [CategoriesController],
  providers: [ListCategoriesHandler, { provide: CATEGORY_REPOSITORY, useClass: TypeOrmCategoryRepository }],
})
export class CatalogModule {}
