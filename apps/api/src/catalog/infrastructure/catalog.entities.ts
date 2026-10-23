import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity({ name: "merchants" })
export class MerchantEntity {
  @PrimaryColumn("uuid")
  id!: string;

  @Column({ type: "text", unique: true })
  slug!: string;

  @Column({ type: "text" })
  name!: string;
}

@Entity({ name: "categories" })
export class CategoryEntity {
  @PrimaryColumn("uuid")
  id!: string;

  @Column({ type: "text", unique: true })
  slug!: string;

  @Column({ type: "text" })
  name!: string;
}

@Entity({ name: "products" })
export class ProductEntity {
  @PrimaryColumn("uuid")
  id!: string;

  @Column({ name: "merchant_id", type: "uuid" })
  merchantId!: string;

  @Column({ name: "category_id", type: "uuid" })
  categoryId!: string;

  @Column({ name: "item_ref", type: "text" })
  itemRef!: string;

  @Column({ type: "text" })
  name!: string;

  @Column({ type: "text" })
  description!: string;

  @Column({ name: "price_minor", type: "integer" })
  priceMinor!: number;

  @Column({ type: "char", length: 3 })
  currency!: string;

  @Column({ type: "integer" })
  stock!: number;

  @Column({ name: "listed_at", type: "timestamptz" })
  listedAt!: Date;
}
