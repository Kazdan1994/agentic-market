import { loadLocalEnv } from "../../shared/config/load-env";
import { Argon2PasswordHasher } from "../../identity/infrastructure/argon2-password-hasher";
import { createDataSource } from "../data-source";
import { seedCatalog } from "./seed-catalog";
import { seedUsers } from "./seed-users";

type SeedStep = { name: string; run: (ds: ReturnType<typeof createDataSource>) => Promise<void> };

/** Idempotent seed steps, run in order. */
function seedSteps(demoPassword: string): readonly SeedStep[] {
  return [
    { name: "users", run: (ds) => seedUsers(ds, new Argon2PasswordHasher(), demoPassword) },
    { name: "catalog", run: seedCatalog },
  ];
}

async function main(): Promise<void> {
  loadLocalEnv();
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set (see .env.example)");
  }
  const demoPassword = process.env.SEED_DEMO_PASSWORD;
  if (!demoPassword) {
    throw new Error("SEED_DEMO_PASSWORD is not set (see .env.example)");
  }
  const steps = seedSteps(demoPassword);
  const dataSource = createDataSource(databaseUrl);
  await dataSource.initialize();
  try {
    for (const step of steps) {
      await step.run(dataSource);
      console.log(`Seeded ${step.name}`);
    }
    console.log(`Seed complete (${steps.length} step(s))`);
  } finally {
    await dataSource.destroy();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
