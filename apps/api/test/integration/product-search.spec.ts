import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { TypeOrmProductRepository } from "../../src/catalog/infrastructure/typeorm-product-repository";
import { seedCatalog } from "../../src/database/seed/seed-catalog";
import { closeTestDataSource, getTestDataSource, truncateAll } from "../support/postgres";

describe("TypeOrmProductRepository (Postgres)", () => {
  let repo: TypeOrmProductRepository;

  beforeAll(async () => {
    await truncateAll();
    const ds = await getTestDataSource();
    await seedCatalog(ds);
    repo = new TypeOrmProductRepository(ds);
  });
  afterAll(closeTestDataSource);

  it("searches name, description and category across every merchant, with merchant and category joined", async () => {
    const results = await repo.search("wireless running earbuds", { limit: 20 });
    const runbuds = results.filter((r) => r.product.itemRef === "audio-runbuds-pro");
    expect(runbuds.map((r) => r.merchant.slug).sort()).toEqual(["soundhub", "techcorner"]);
    expect(runbuds[0]?.category).toMatchObject({ slug: "audio", name: "Audio" });
    // Cheaper offer of the same item ranks first on equal score.
    expect(runbuds[0]?.merchant.slug).toBe("techcorner");
    // A category-name match alone is enough.
    expect((await repo.search("kitchen", { limit: 50 })).length).toBeGreaterThanOrEqual(5);
  });

  it("filters by category slug and honours the limit", async () => {
    const lamps = await repo.search("lamp headlamp", { categorySlug: "sports", limit: 20 });
    expect(lamps.every((r) => r.category.slug === "sports")).toBe(true);
    expect(lamps.map((r) => r.product.itemRef)).toContain("sports-headlamp");
    expect(await repo.search("audio", { limit: 2 })).toHaveLength(2);
  });

  it("finds a product by id, or null", async () => {
    const [first] = await repo.search("lamp", { limit: 1 });
    const id = first?.product.id ?? "";
    expect((await repo.findById(id))?.product.id).toBe(id);
    expect(await repo.findById("00000000-0000-7000-8000-000000000999")).toBeNull();
  });
});
