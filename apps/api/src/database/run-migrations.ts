import { loadLocalEnv } from "../shared/config/load-env";
import { createDataSource } from "./data-source";

async function main(): Promise<void> {
  loadLocalEnv();
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set (see .env.example)");
  }
  const dataSource = createDataSource(databaseUrl);
  await dataSource.initialize();
  try {
    if (process.argv.includes("--revert")) {
      await dataSource.undoLastMigration();
      console.log("Reverted the last migration");
    } else {
      const applied = await dataSource.runMigrations();
      console.log(`Applied ${applied.length} migration(s)`);
    }
  } finally {
    await dataSource.destroy();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
