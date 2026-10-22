import { existsSync } from "node:fs";
import path from "node:path";

/** Loads the nearest `.env.local` (repository root) into process.env without overriding it. */
export function loadLocalEnv(startDir: string = process.cwd()): void {
  let dir = path.resolve(startDir);
  for (;;) {
    const candidate = path.join(dir, ".env.local");
    if (existsSync(candidate)) {
      process.loadEnvFile(candidate);
      return;
    }
    const parent = path.dirname(dir);
    if (parent === dir) return;
    dir = parent;
  }
}
