import { inject } from "vitest";
import type { DataSource } from "typeorm";
import { createDataSource } from "../../src/database/data-source";

let dataSource: DataSource | undefined;

export async function getTestDataSource(): Promise<DataSource> {
  if (!dataSource) {
    dataSource = createDataSource(inject("databaseUrl"));
    await dataSource.initialize();
  }
  return dataSource;
}

/** Empties every application table. Append-only guards are bypassed by TRUNCATE on purpose. */
export async function truncateAll(): Promise<void> {
  const ds = await getTestDataSource();
  const rows: { tablename: string }[] = await ds.query(
    "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> 'migrations'",
  );
  if (rows.length === 0) return;
  const tables = rows.map((r) => `"${r.tablename}"`).join(", ");
  await ds.query(`TRUNCATE ${tables} RESTART IDENTITY CASCADE`);
}

export async function closeTestDataSource(): Promise<void> {
  await dataSource?.destroy();
  dataSource = undefined;
}
