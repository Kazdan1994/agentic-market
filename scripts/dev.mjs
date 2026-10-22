// Starts the whole local stack with one command:
// database container, migrations, seed, then the API and web dev servers.
import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

if (!existsSync(".env.local")) {
  console.error("[dev] .env.local is missing: copy .env.example to .env.local and fill it in.");
  process.exit(1);
}

const steps = [
  ["docker", ["compose", "--env-file", ".env.local", "up", "-d", "--wait", "db"]],
  ["yarn", ["workspace", "api", "build"]],
  ["yarn", ["workspace", "api", "migrate"]],
  ["yarn", ["workspace", "api", "seed"]],
];

for (const [command, args] of steps) {
  const result = spawnSync(command, args, { stdio: "inherit" });
  if (result.status !== 0) {
    console.error(`[dev] "${command} ${args.join(" ")}" failed with exit code ${result.status}`);
    process.exit(result.status ?? 1);
  }
}

const servers = [
  { name: "api", args: ["workspace", "api", "dev"] },
  { name: "web", args: ["workspace", "web", "dev"] },
];

const children = servers.map(({ name, args }) => {
  const child = spawn("yarn", args, { stdio: ["ignore", "pipe", "pipe"] });
  const prefix = (chunk) =>
    chunk
      .toString()
      .split("\n")
      .filter((line) => line.length > 0)
      .map((line) => `[${name}] ${line}`)
      .join("\n") + "\n";
  child.stdout.on("data", (chunk) => process.stdout.write(prefix(chunk)));
  child.stderr.on("data", (chunk) => process.stderr.write(prefix(chunk)));
  child.on("exit", (code) => {
    console.error(`[dev] ${name} exited with code ${code}`);
    shutdown(code ?? 1);
  });
  return child;
});

let stopping = false;
function shutdown(code) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill("SIGTERM");
  process.exit(code);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
