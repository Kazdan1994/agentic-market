import { Inject } from "@nestjs/common";
import { type IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { CATEGORY_REPOSITORY, type CategoryRepository } from "../domain/category";

export class ListCategoriesQuery {
  readonly kind = "list-categories";
}

export interface CategoryView {
  slug: string;
  name: string;
}

@QueryHandler(ListCategoriesQuery)
export class ListCategoriesHandler implements IQueryHandler<ListCategoriesQuery, CategoryView[]> {
  constructor(@Inject(CATEGORY_REPOSITORY) private readonly categories: CategoryRepository) {}

  async execute(): Promise<CategoryView[]> {
    const all = await this.categories.listAll();
    return all.map(({ slug, name }) => ({ slug, name }));
  }
}
