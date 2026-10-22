import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";

// SWC keeps decorator metadata, which NestJS dependency injection needs.
export default defineConfig({
  plugins: [swc.vite({ module: { type: "es6" } })],
  test: {
    projects: [
      {
        extends: true,
        test: { name: "unit", include: ["src/**/*.spec.ts"], environment: "node" },
      },
      {
        extends: true,
        test: {
          name: "integration",
          include: ["test/**/*.spec.ts"],
          globalSetup: ["test/support/global-setup.ts"],
          environment: "node",
          testTimeout: 60_000,
          hookTimeout: 120_000,
          pool: "forks",
          maxWorkers: 1,
        },
      },
    ],
  },
});
