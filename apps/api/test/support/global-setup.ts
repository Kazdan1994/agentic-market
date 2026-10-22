import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import type { TestProject } from "vitest/node";
import { createDataSource } from "../../src/database/data-source";

declare module "vitest" {
  export interface ProvidedContext {
    databaseUrl: string;
  }
}

let container: StartedPostgreSqlContainer | undefined;

/** One Postgres container for the whole integration run, migrated once (research R4). */
export default async function setup(project: TestProject): Promise<() => Promise<void>> {
  container = await new PostgreSqlContainer("postgres:18").start();
  const databaseUrl = container.getConnectionUri();
  const dataSource = createDataSource(databaseUrl);
  await dataSource.initialize();
  await dataSource.runMigrations();
  await dataSource.destroy();
  project.provide("databaseUrl", databaseUrl);
  return async () => {
    await container?.stop();
  };
}
