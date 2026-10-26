import { Injectable } from "@nestjs/common";
import { DataSource } from "typeorm";
import type { Category, CategoryRepository } from "../domain/category";
import { CategoryEntity } from "./catalog.entities";

@Injectable()
export class TypeOrmCategoryRepository implements CategoryRepository {
  constructor(private readonly dataSource: DataSource) {}

  async listAll(): Promise<Category[]> {
    const rows = await this.dataSource.getRepository(CategoryEntity).find({ order: { slug: "ASC" } });
    return rows.map(({ id, slug, name }) => ({ id, slug, name }));
  }
}
