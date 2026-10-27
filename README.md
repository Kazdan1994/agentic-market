# Agentic Market

A demo marketplace where users hand purchases to AI shopping agents. Each agent works under a
mandate: a per-purchase cap, a total budget, a list of allowed categories and an expiry. The
agent searches a catalog shared by several merchants, compares their offers, picks a product
and completes a simulated checkout without human input. While it runs, each decision shows up
in a live log.

## How it works

1. A signed-in user creates an agent and gives it a mandate.
2. The user starts a run with a request such as "wireless headphones for running".
3. The agent searches the catalog, rates each candidate, and chooses one. A local LLM
   (Ollama) makes the choice. If the model is missing, slow (over 10 s) or disabled, a
   rule-based selector takes over.
4. The mandate is checked again at checkout, the simulated payment runs, and an order is
   created only when the payment is approved.
5. Log entries stream to the browser over SSE: search, evaluations, selection, mandate
   check, payment and outcome.

## Stack

| Part | Tech |
| --- | --- |
| `apps/api` | NestJS, TypeORM, PostgreSQL 18, Vitest + Testcontainers |
| `apps/web` | React, Vite, TanStack Query, shadcn/ui, typed client generated from OpenAPI |
| AI | Ollama (`gemma4:e2b` by default), optional |

## Getting started

Requirements for local development: Node 26 (see `.nvmrc`), Yarn 4 and Docker. Ollama is
optional. To run without Node, see [Run everything in Docker](#run-everything-in-docker).

```bash
cp .env.example .env.local   # set POSTGRES_PASSWORD, SEED_DEMO_PASSWORD, JWT_SECRET, ...
yarn install
yarn dev
```

`yarn dev` starts the database container, runs migrations and the seed (safe to rerun), then
serves the API on http://localhost:3000 and the web app on http://localhost:5173.

The seed creates two users, `alice@demo.local` and `bob@demo.local`. Both log in with
`SEED_DEMO_PASSWORD`.

### Run everything in Docker

Docker alone is enough to run the whole stack, with no Node or Yarn on the host. Fill in
`.env.local` as above, then:

```bash
docker compose --env-file .env.local up --build
```

| Service | What it does | Host port |
| --- | --- | --- |
| `db` | PostgreSQL 18 | `POSTGRES_PORT` (5432) |
| `migrate` | One-shot: runs migrations and the seed, then exits | none |
| `api` | NestJS API (also serves `/docs`) | `API_PORT` (3000) |
| `web` | nginx serving the built app and proxying `/v1`, `/mcp` and `/health` to the API | `WEB_PORT` (8080) |
| `ollama`, `ollama-pull` | Local LLM on CPU, only with `--profile ai` | `OLLAMA_PORT` (11434) |

Open http://localhost:8080. Secrets are read from `.env.local` at startup and are never
written into `docker-compose.yml`.

To add the local model, set `DOCKER_OLLAMA_BASE_URL=http://ollama:11434` in `.env.local`
and start with the `ai` profile:

```bash
docker compose --env-file .env.local --profile ai up --build
```

`ollama-pull` downloads `AI_MODEL` into the `ollama-data` volume on first start, so expect a
wait. Until it finishes, runs fall back to the rule-based selector. With
`DOCKER_OLLAMA_BASE_URL` empty, the API always uses rules. To reach an Ollama running on the
host instead, use `http://host.docker.internal:11434`.

Notes:

- `yarn dev` and the Docker stack share the same `db` container and volume, so data carries
  over. Both serve the API on `API_PORT`, so don't run them together.
- If `POSTGRES_PASSWORD` contains URL-reserved characters (`@`, `/`, `:`), the `DATABASE_URL`
  built by Compose breaks. Stick to letters and digits.
- Stop with `docker compose --env-file .env.local down`; add `-v` to also wipe the database
  and model volumes.

### AI selection

Set `OLLAMA_BASE_URL` and `AI_MODEL` in `.env.local`, then pull the model:

```bash
ollama pull gemma4:e2b
```

`AGENT_SELECTION_MODE=rules` forces the rule-based selector. A cold model load can take longer
than the 10 s limit, in which case that run falls back to rules. `GET /health` reports
`"ai":"warm"` once the model is loaded.

## Scripts

| Command | What it does |
| --- | --- |
| `yarn dev` | Database, migrations, seed, API and web in watch mode |
| `yarn typecheck` | `tsc --noEmit` in every workspace |
| `yarn lint` | ESLint |
| `yarn test` | Unit, integration and contract tests (no live AI calls) |
| `yarn build` | Builds both apps |
| `yarn workspace api export:openapi` | Writes `apps/api/openapi.json` |
| `yarn workspace web generate:api` | Regenerates the typed web client from it |

Run the full gate before committing:

```bash
yarn typecheck && yarn lint && yarn test && yarn build
```

## Docs

The spec, plan, data model, API contracts and end-to-end scenarios are in
[`specs/001-agent-mandate-checkout/`](specs/001-agent-mandate-checkout/). Start with
[`quickstart.md`](specs/001-agent-mandate-checkout/quickstart.md).

The spec also describes an MCP tool interface for third-party agents. It is not built yet.
