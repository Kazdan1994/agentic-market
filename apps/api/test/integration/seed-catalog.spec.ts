import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { seedCatalog } from "../../src/database/seed/seed-catalog";
import { closeTestDataSource, getTestDataSource, truncateAll } from "../support/postgres";

async function count(table: string): Promise<number> {
  const ds = await getTestDataSource();
  const [row] = await ds.query(`SELECT count(*)::int AS n FROM ${table}`);
  return (row as { n: number }).n;
}

describe("catalog seed (Postgres)", () => {
  beforeAll(async () => {
    await truncateAll();
    await seedCatalog(await getTestDataSource());
  });
  afterAll(closeTestDataSource);

  it("creates 2-3 merchants, the five categories and 30-50 products", async () => {
    const ds = await getTestDataSource();
    expect(await count("merchants")).toBeGreaterThanOrEqual(2);
    expect(await count("merchants")).toBeLessThanOrEqual(3);
    const slugs: { slug: string }[] = await ds.query("SELECT slug FROM categories ORDER BY slug");
    expect(slugs.map((r) => r.slug)).toEqual(["audio", "books", "home", "kitchen", "sports"]);
    expect(await count("products")).toBeGreaterThanOrEqual(30);
    expect(await count("products")).toBeLessThanOrEqual(50);
  });

  it("sells at least 5 items at two or more merchants at different prices", async () => {
    const ds = await getTestDataSource();
    const rows: unknown[] = await ds.query(`
      SELECT item_ref FROM products GROUP BY item_ref
      HAVING count(DISTINCT merchant_id) >= 2 AND count(DISTINCT price_minor) >= 2`);
    expect(rows.length).toBeGreaterThanOrEqual(5);
  });

  it("includes a declined-price product and an out-of-stock product", async () => {
    const ds = await getTestDataSource();
    const [declined] = await ds.query("SELECT count(*)::int AS n FROM products WHERE price_minor % 100 = 13");
    const [empty] = await ds.query("SELECT count(*)::int AS n FROM products WHERE stock = 0");
    expect((declined as { n: number }).n).toBeGreaterThanOrEqual(1);
    expect((empty as { n: number }).n).toBeGreaterThanOrEqual(1);
  });

  it("changes nothing when run twice", async () => {
    const ds = await getTestDataSource();
    const before = await ds.query("SELECT id, price_minor, stock FROM products ORDER BY id");
    await seedCatalog(ds);
    expect(await ds.query("SELECT id, price_minor, stock FROM products ORDER BY id")).toEqual(before);
  });
});
