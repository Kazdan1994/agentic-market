# Research: Agent Mandate Checkout

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**: 2026-10-22

Versions were checked against the npm registry on 2026-10-22. The local toolchain is
Node v26.12.0, Docker 29.9.2, yarn 1.22.22 and pnpm 10.0.0.

## R1. Workspace layout and package manager

- **Decision**: one repository with yarn (classic) workspaces and two apps, `apps/api`
  (NestJS) and `apps/web` (Vite + React). There is no shared code package; the web client's
  types are generated from the API's OpenAPI document (R9).
- **Rationale**: the constitution allows one backend and one frontend (Principle VI). Yarn
  matches the standard gate (`yarn typecheck && yarn lint && yarn test && yarn build`) used
  elsewhere by the project owner. Generating the client from OpenAPI keeps the public
  contract as the single source of truth (Principle III) and avoids a third package.
- **Alternatives considered**: pnpm workspaces (faster, stricter, but the gate commands are
  written for yarn); Nx/Turborepo (orchestration not needed for two apps); a
  `packages/contracts` shared types package (duplicates the OpenAPI contract and lets the
  web app bypass it).

## R2. Backend framework versions

- **Decision**: NestJS 12 (`@nestjs/core` 12.2.0, `@nestjs/cqrs` 12.1.1,
  `@nestjs/typeorm` 12.0.2, `@nestjs/swagger` 12.0.3, `@nestjs/jwt` 12.0.3), TypeORM 1.1.2,
  `pg` 8.23.1, TypeScript strict, Node 26.
- **Rationale**: current majors, mutually compatible, fixed by the constitution's stack.
- **Alternatives considered**: none; the stack is set by the constitution.

## R3. Request validation and OpenAPI generation

- **Decision**: HTTP DTOs use `class-validator` 0.15 + `class-transformer` with a global
  `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`, `transform`). `@nestjs/swagger`
  generates the OpenAPI document from those DTOs. Zod 4 is used only for MCP tool input
  schemas (the MCP SDK requires it) and the AI output schema (`z.toJSONSchema` feeds
  Ollama's `format`, and the same schema validates the answer).
- **Rationale**: `nestjs-zod` 5.5.0 declares peers `@nestjs/common ^10 || ^11` only, so a
  zod-everywhere setup is not supported on NestJS 12. See Complexity Tracking in the plan.
- **Alternatives considered**: zod everywhere via `nestjs-zod` (incompatible peer range);
  class-validator everywhere (the MCP SDK expects zod schemas for tools); hand-written JSON
  Schema for MCP (more code, no type inference).

## R4. Testing toolchain

- **Decision**: Vitest 5 for both apps. The API uses `unplugin-swc` 2.0 so decorator
  metadata works under Vitest. Persistence adapters are tested against real Postgres via
  `@testcontainers/postgresql` 12.2. HTTP contract tests use `supertest` 7.3 against a
  booted Nest app with a containerized database. The web app uses
  `@testing-library/react` 16.3 with jsdom.
- **Test layers** (Principle II):
  - domain unit tests: no Nest, no database
  - handler tests: CQRS handlers with in-memory port adapters
  - adapter integration tests: TypeORM repositories against Postgres
  - contract tests: every HTTP endpoint, the SSE stream and every MCP tool
  - web component tests: forms, live run view and order list
- **Rationale**: one runner and one assertion API across apps; Testcontainers satisfies
  "persistence adapters tested against real Postgres, never a TypeORM mock".
- **Alternatives considered**: Jest 30 for the API (NestJS's default, but then two runners
  with different configs); a shared long-lived test database (state leaks between tests).

## R5. AI product selection (local model)

- **Decision**: a local model served by Ollama (installed: 0.40.6), default model
  `gemma4:e2b`, configurable with `AI_MODEL`. The `OllamaProductSelector` adapter calls
  Ollama's native `POST {OLLAMA_BASE_URL}/api/chat` with Node's built-in `fetch`; no SDK
  dependency. Request settings:
  - `stream: false`, `think: false`, `options.temperature: 0`, `keep_alive: "30m"`
  - `format`: the JSON Schema of the output, generated from a zod schema with
    `z.toJSONSchema` (constrained decoding)
  - `signal: AbortSignal.timeout(10_000)`, with no retries
- **Output schema**: `{ chosenProductId: string | null, reason: string, evaluations:
  { productId, verdict: "kept" | "discarded", reason }[] }`. The response is parsed with the
  same zod schema. The prompt asks for reasons of 15 words or fewer to keep output short.
- **Missing evaluations**: a candidate the model left out gets the rule-based verdict in
  the log, marked as "not evaluated by AI". A valid `chosenProductId` is still accepted.
- **Fallback triggers** (FR-009a), each mapped to a `fallback_reason` value:
  - `not_configured`: `AI_MODEL` or `OLLAMA_BASE_URL` unset
  - `forced_rules`: `AGENT_SELECTION_MODE=rules`
  - `unavailable`: connection refused, i.e. Ollama not running
  - `timeout`: no answer within 10 s, which includes a cold model load
  - `api_error`: a non-200 status, e.g. model not pulled
  - `unusable_answer`: the output fails the schema
  - `ineligible_choice`: the chosen product is not among the eligible candidates
- **Warm-up**: on API boot, a background one-token request loads the model with
  `keep_alive: "30m"`, and every run refreshes it. `GET /health` reports
  `ai: warm | cold | unavailable` from `GET /api/ps`. A run that hits a cold model falls
  back to rules after 10 s while the load finishes, so the next run uses the AI.
- **Input**: the AI receives only the user's request and the eligible candidates' public
  fields (id, merchant name, name, description, category, price), already filtered by the
  mandate (FR-009c). Nothing leaves the machine.
- **Measured on the demo machine** (Apple M3, 16 GB, 2026-10-22; 8 candidates, the same
  item at two merchants):

  | Model | Load (cold) | Inference (warm) | Output tokens | Correct pick | Evaluations |
  |---|---|---|---|---|---|
  | `gemma4:e2b` | 42–49 s | ~4–6 s | ~260 | yes (cheaper offer) | 7 of 8 |
  | `qwen3:8b` | 40–47 s | ~20–22 s | ~238 | yes | 8 of 8 |

  Only `gemma4:e2b` fits the 10 s budget when warm. Every benchmark call paid a full model
  load, meaning Ollama evicted the model between calls (memory pressure, or another client
  loading a different model). The demo needs the model to stay in memory; see quickstart
  prerequisites.
- **Rationale**: the project owner asked for local AI. Ollama is already installed with
  models pulled. The native API supports JSON-schema constrained output, and plain `fetch`
  with `AbortSignal.timeout` gives a hard 10 s ceiling with no extra dependency
  (Principle VI).
- **Alternatives considered**:
  - `qwen3:8b`: better coverage, but ~20 s warm, which breaks the 10 s rule
  - `gemma3:12b`: larger than qwen3:8b, so slower still; not benchmarked
  - the `ollama` npm package 0.6.4: no per-request abort signal (only a global
    `abort()`), and a dependency for one call
  - the OpenAI-compatible `/v1` endpoint with the `openai` SDK: adds an SDK; the native
    endpoint already has `format` and `keep_alive`
  - a hosted model (Anthropic API): rejected by the project owner in favour of local AI

## R6. Live run updates

- **Decision**: Server-Sent Events, `GET /v1/runs/{runId}/events`, using NestJS `@Sse()`.
  Each log entry is sent as an SSE event whose `id` is the entry's sequence number. On
  connect or reconnect, the server replays every stored entry with
  `seq > Last-Event-ID` (or all of them), then streams new ones. The stream ends with a
  `run.completed` event. The web app uses the browser `EventSource`, which reconnects
  automatically and sends `Last-Event-ID`.
- **In-process fan-out**: when a log entry is appended (and committed), the run context
  publishes a CQRS event. An SSE adapter subscribes per run.
- **Rationale**: the traffic is one-way, from server to browser. SSE gives replay without
  duplicates (FR-021b) and needs no extra library or proxy setup.
- **Alternatives considered**: WebSockets (two-way, so more moving parts for no benefit);
  polling every 500 ms (wasteful and laggy against SC-002a's 1-second target).

## R7. Running agent runs in the background

- **Decision**: `POST /v1/mandates/{id}/runs` dispatches a `StartRunCommand`. The handler
  validates the request, inserts the run (`status = running`) and returns `202 { runId }`.
  A `RunStartedEvent` handler then executes the run in-process (an async task, not awaited
  by the request). A partial unique index allows only one `running` run per mandate
  (FR-010).
- **Restarts**: on boot, any run still `running` is closed with outcome `interrupted`, and a
  log entry explains why.
- **Rationale**: a local demo with a handful of users needs no queue (Principle VI). The
  partial unique index enforces "one run at a time" even under races.
- **Alternatives considered**: a job queue (BullMQ or pg-boss), which brings a broker or
  extra tables for no demo benefit; running the agent synchronously inside the HTTP
  request, which blocks the client and fights the live view.
- **Spec**: `interrupted` was added to FR-007 on 2026-10-22.

## R8. The built-in agent as an outside customer (FR-010a)

- **Decision**: the `agent` bounded context reaches the store only through a `StorePort`.
  Its production adapter is an HTTP client calling the API's own public `/v1` agent
  endpoints over loopback, authenticated with a system-issued mandate key of kind
  `builtin`. That key is created with the mandate and never shown to anyone; its secret is
  derived with HMAC from `BUILTIN_KEY_SECRET` and the mandate ID, so nothing reversible is
  stored. Handler tests use an in-memory `StorePort`.
- **Rationale**: this makes "same rights as any third-party agent" literal and testable.
  The agent cannot call a repository, because no such dependency exists in its module.
- **Alternatives considered**: calling the store's CQRS queries in-process with a
  mandate-scoped principal (same rules, but the boundary is a convention instead of a
  network contract); a separate agent process (more deployables).

## R9. Web client generation

- **Decision**: `openapi-typescript` 7.13 generates `apps/web/src/api/schema.d.ts` from the
  API's exported `openapi.json`; `openapi-fetch` 0.17 provides the typed client; server
  state lives in TanStack Query 5.104. Styling uses Tailwind 4.3 with shadcn/ui components.
  Vite 8.3, React 19.3, React Router 8.5.
- **Rationale**: a typed client derived from the contract; a contract drift breaks
  `yarn typecheck` in the web app.
- **Alternatives considered**: hand-written fetch wrappers (drift risk); Orval (heavier,
  generates hooks we don't need).

## R10. Third-party agent interface (MCP)

- **Decision**: `@modelcontextprotocol/sdk` 1.32 `McpServer` with the Streamable HTTP
  transport in stateless mode, mounted at `POST /mcp`. Auth is
  `Authorization: Bearer <mandate key>`. Four tools: `search_catalog`, `get_product`,
  `get_mandate`, `checkout`. Each tool is a thin adapter dispatching the same CQRS
  query/command as the HTTP endpoints.
- **Rationale**: MCP is the standard format AI assistants connect to (FR-010b). Stateless
  mode needs no session storage.
- **Alternatives considered**: an OpenAPI-only interface (agents need a tool catalog with
  descriptions); a stateful MCP session (no need, every call carries the key).

## R11. Authentication

- **Decision**:
  - users: seeded demo accounts; `POST /v1/auth/login` (email + password, argon2id hash)
    sets an httpOnly, SameSite=Lax JWT cookie (`@nestjs/jwt`, 8-hour expiry)
  - agents: `Authorization: Bearer amk_<random>` mandate keys (32 random bytes,
    base64url); only the SHA-256 hash and the last 4 characters are stored
  - two guards (`UserAuthGuard`, `MandateKeyGuard`); every controller declares which
    principal it accepts
- **Rationale**: the spec puts sign-up out of scope. Hashed keys mean a database leak does
  not leak usable keys (Principle IV). Unknown, revoked or foreign keys all return the same
  401 (spec edge case).
- **Alternatives considered**: OAuth/SSO (overkill for seeded demo users); server-side
  sessions in Postgres (extra table, no benefit locally).

## R12. Money, budget concurrency and idempotency

- **Decision**:
  - amounts are `integer` columns in minor units with `currency char(3)` (always `EUR`)
  - checkout runs in one transaction that:
    1. locks the mandate row (`SELECT … FOR UPDATE`)
    2. locks the product row
    3. re-checks every rule (FR-011)
    4. inserts the payment, order and audit rows
    5. increments `spent_minor` and decrements `stock`
  - idempotency is a unique `(mandate_id, idempotency_key)` on `payments`; a replay
    returns the stored result, and a replay with a different body returns
    `409 IDEMPOTENCY_KEY_REUSED`
- **Rationale**: row locks make budget and stock checks safe across concurrent runs and
  third-party agents (FR-024a, edge cases). Database constraints are the last line of
  defence: `spent_minor <= total_budget_minor`, `stock >= 0`.
- **Alternatives considered**: optimistic version columns with retries (more code paths
  for a low-traffic demo); Serializable isolation (retry handling everywhere).

## R13. Simulated payments

- **Decision**: a `PaymentGatewayPort` with a `SimulatedPaymentGateway` adapter. It declines
  when `amount_minor % 100 === SIMULATED_DECLINE_CENTS` (default `13`, so any price ending
  in `,13 €`). The seed includes at least one such product.
- **Rationale**: a deterministic, documented demo trigger (spec assumption). Keeping the
  rule in the payment adapter keeps the catalog free of payment knowledge.
- **Alternatives considered**: a random decline rate (not repeatable); a flag on the product
  (mixes payment behaviour into the catalog).

## R14. Append-only logs and audit trail

- **Decision**: the `run_log_entries`, `mandate_activity` and `audit_events` tables get a
  `BEFORE UPDATE OR DELETE` trigger that raises an exception. Repositories expose append
  and read only.
- **Rationale**: FR-020 and FR-023 are enforced by the database, not only by convention.
- **Alternatives considered**: application-only discipline (one bug away from an edited
  log).

## R15. Observability

- **Decision**:
  - `nestjs-pino` 5.3 / `pino` 10.4 for JSON logs
  - `pino-http` takes `X-Correlation-Id` from the request or generates a UUID, and
    returns it on the response
  - the ID is stored in Node `AsyncLocalStorage` and copied onto commands, events, outbound
    HTTP calls (the built-in agent's loopback calls forward it), log entries and audit rows
  - redaction paths cover `authorization`, `cookie`, `password` and the `amk_` key pattern
- **Rationale**: Principle V. Using `AsyncLocalStorage` directly avoids adding a CLS
  library.
- **Alternatives considered**: `nestjs-cls` (an extra dependency for about 20 lines of
  code); OpenTelemetry (no backend in a local demo).

## R16. Local runtime

- **Decision**:
  - `docker-compose.yml` runs Postgres 18 on port 5432
  - `yarn dev` runs migrations, seeds idempotently, then starts the API (`:3000`) and the
    web app (`:5173`, proxying `/v1` and `/mcp` to the API)
  - configuration comes from `.env.local` (untracked) with a tracked `.env.example`
- **Rationale**: the constitution's "local only, one documented command".
- **Alternatives considered**: running everything in containers (slower dev loop, no
  benefit on one machine).
