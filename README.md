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

Requirements: Node 26 (see `.nvmrc`), Yarn 4 and Docker. Ollama is optional.

```bash
cp .env.example .env.local   # set POSTGRES_PASSWORD, SEED_DEMO_PASSWORD, JWT_SECRET, ...
yarn install
yarn dev
```

`yarn dev` starts the database container, runs migrations and the seed (safe to rerun), then
serves the API on http://localhost:3000 and the web app on http://localhost:5173.

The seed creates two users, `alice@demo.local` and `bob@demo.local`. Both log in with
`SEED_DEMO_PASSWORD`.

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
