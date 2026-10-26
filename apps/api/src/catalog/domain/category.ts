export interface Category {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
}

export interface CategoryRepository {
  listAll(): Promise<Category[]>;
}

export const CATEGORY_REPOSITORY = Symbol("CategoryRepository");
