import { DataSource } from "typeorm";
import { entities } from "./entities";
import { migrations } from "./migrations";

/** Schema changes go through migrations only; `synchronize` stays off (constitution). */
export function createDataSource(databaseUrl: string): DataSource {
  return new DataSource({
    type: "postgres",
    url: databaseUrl,
    entities,
    migrations,
    synchronize: false,
    migrationsRun: false,
    logging: false,
  });
}
