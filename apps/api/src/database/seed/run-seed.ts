import { loadLocalEnv } from "../../shared/config/load-env";
import { createDataSource } from "../data-source";

/** Idempotent seed runner. Seed steps are registered here as they land (T035, T039). */
const seedSteps: ReadonlyArray<{ name: string; run: (ds: ReturnType<typeof createDataSource>) => Promise<void> }> = [];

async function main(): Promise<void> {
  loadLocalEnv();
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set (see .env.example)");
  }
  const dataSource = createDataSource(databaseUrl);
  await dataSource.initialize();
  try {
    for (const step of seedSteps) {
      await step.run(dataSource);
      console.log(`Seeded ${step.name}`);
    }
    console.log(`Seed complete (${seedSteps.length} step(s))`);
  } finally {
    await dataSource.destroy();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
