---

description: "Task list for feature 001: Agent Mandate Checkout"
---

# Tasks: Agent Mandate Checkout

**Input**: Design documents from `/specs/001-agent-mandate-checkout/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: REQUIRED. Constitution Principle II (Test-First, NON-NEGOTIABLE): every test task
is written first and MUST fail for the right reason before its implementation task starts.

**Organization**: tasks are grouped by user story. Each group is also tagged with the
delivery slice from plan.md ("Slice N"); each slice is one stacked PR that must compile, pass
its tests and stay within the PR budget (~7 files / ~120 lines, ceiling 19 files / 400 lines,
excluding lockfiles, migrations and generated files). If a slice crosses the ceiling during
implementation, stop and cut it by entity before continuing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: the user story the task serves (US1–US4)
- Paths are relative to the repository root

## Path Conventions

- API: `apps/api/src/<context>/{domain,application,infrastructure}/`, unit and handler tests
  next to sources as `*.spec.ts`, integration tests in `apps/api/test/integration/`, contract
  tests in `apps/api/test/contract/`
- Web: `apps/web/src/features/<feature>/`, tests next to components as `*.test.tsx`
- Migrations: `apps/api/src/database/migrations/`; seeds: `apps/api/src/database/seed/`

---

## Phase 1: Setup (Shared Infrastructure) · Slice 1

**Purpose**: create the workspace, the tooling and the test harness.

- [ ] T001 Create root `package.json` with yarn workspaces `["apps/*"]`, `"private": true`, `engines.node: ">=26"` and scripts `dev`, `typecheck`, `lint`, `test`, `build` that run each workspace; add `.nvmrc` (`26`) and `.gitignore` (`node_modules`, `dist`, `.env.local`, `coverage`, `apps/api/openapi.json`)
- [ ] T002 [P] Create `docker-compose.yml` with service `db` (`postgres:18`, database `agentic_market`, port `5432`, named volume, `pg_isready` healthcheck)
- [ ] T003 [P] Create `.env.example` listing every variable with a comment: `DATABASE_URL`, `API_PORT=3000`, `API_INTERNAL_BASE_URL=http://localhost:3000`, `JWT_SECRET`, `BUILTIN_KEY_SECRET`, `SEED_DEMO_PASSWORD`, `OLLAMA_BASE_URL`, `AI_MODEL=gemma4:e2b`, `AGENT_SELECTION_MODE=auto`, `AI_TIMEOUT_MS=10000`, `SIMULATED_DECLINE_CENTS=13` (no real values)
- [ ] T004 Scaffold `apps/api` (`package.json` with NestJS 12, `@nestjs/cqrs`, `@nestjs/typeorm`, `typeorm`, `pg`, `@nestjs/swagger`, `@nestjs/jwt`, `class-validator`, `class-transformer`, `cookie-parser`, `nestjs-pino`, `pino-http`, `argon2`, `zod`, `@modelcontextprotocol/sdk`; dev: `vitest`, `unplugin-swc`, `@swc/core`, `supertest`, `@testcontainers/postgresql`), `tsconfig.json` with `strict: true`, `experimentalDecorators`, `emitDecoratorMetadata`, and `src/main.ts` placeholder
- [ ] T005 [P] Configure `apps/api/vitest.config.ts` with `unplugin-swc` and two projects: `unit` (`src/**/*.spec.ts`) and `integration` (`test/**/*.spec.ts`, single fork, 60 s timeout)
- [ ] T006 [P] Scaffold `apps/web` with Vite 8 + React 19 + TypeScript strict, Tailwind CSS 4, shadcn/ui (`components.json`, `src/components/ui/`), React Router 8, TanStack Query 5, `openapi-fetch`; `vite.config.ts` proxies `/v1` and `/mcp` to `http://localhost:3000`; `vitest.config.ts` with jsdom and `@testing-library/react`
- [ ] T007 [P] Add root ESLint flat config `eslint.config.js` (typescript-eslint strict, no `any` without an inline justification comment, no non-null assertions) and `.prettierrc`
- [ ] T008 Create the Postgres test harness `apps/api/test/support/postgres.ts`: start one `PostgreSqlContainer` per worker, run all migrations, export `truncateAll()`; and `apps/api/test/support/app.ts`: boot the Nest app against that database for supertest, with `AGENT_SELECTION_MODE=rules`

---

## Phase 2: Foundational (Blocking Prerequisites) · Slices 1–2

**Purpose**: shared kernel, database, sign-in and the seeded catalog. Every user story
needs these.

**⚠️ CRITICAL**: no user story work starts until this phase is complete.

### Shared kernel (Slice 1)

- [ ] T009 [P] Write failing unit tests for the `Money` value object in `apps/api/src/shared/domain/money.spec.ts`: amount is an integer number of minor units `>= 0`, currency matches `^[A-Z]{3}$`, `add`/`subtract`/`lessThanOrEqual` reject mixed currencies, `subtract` below zero throws, `format()` returns `"89.00 EUR"`
- [ ] T010 Implement `Money` in `apps/api/src/shared/domain/money.ts`
- [ ] T011 [P] Write failing tests for the error filter in `apps/api/src/shared/http/error.filter.spec.ts`: a `DomainError(code)` maps to the status in the contract (`UNAUTHORIZED` 401, `NOT_FOUND` 404, `VALIDATION_FAILED` 400, `INVALID_REQUEST` 422, `PAYMENT_DECLINED` 402, mandate, budget, stock and price codes plus `IDEMPOTENCY_KEY_REUSED` and `RUN_ALREADY_IN_PROGRESS` 409); the body is `{ error: { code, message, details? } }`; unknown errors return 500 with no stack trace
- [ ] T012 Implement `apps/api/src/shared/errors/error-codes.ts` (the exact enum from `contracts/openapi.yaml`), `apps/api/src/shared/errors/domain-error.ts` and `apps/api/src/shared/http/error.filter.ts`; map class-validator failures to `VALIDATION_FAILED` with field-level `details`
- [ ] T013 [P] Write failing tests for correlation in `apps/api/src/shared/correlation/correlation.spec.ts`: the middleware takes `X-Correlation-Id` (a uuid) or generates one, echoes it on the response, and `CorrelationContext.current()` returns it inside async code (`AsyncLocalStorage`)
- [ ] T014 Implement `apps/api/src/shared/correlation/correlation-context.ts` and `correlation.middleware.ts`
- [ ] T015 [P] Write failing tests for log redaction in `apps/api/src/shared/logging/logger.spec.ts`: `authorization`, `cookie`, any `password` field and any string matching `amk_[A-Za-z0-9_-]+` are censored, and every line carries `correlationId`
- [ ] T016 Implement `apps/api/src/shared/logging/logger.module.ts` with `nestjs-pino` (JSON output, `genReqId` from the correlation context, redaction rules from the test)
- [ ] T017 [P] Create the `Clock` and `IdGenerator` ports in `apps/api/src/shared/domain/clock.ts` and `id-generator.ts`, the adapters `apps/api/src/shared/infrastructure/system-clock.ts` and `uuidv7-generator.ts`, and the test helpers `apps/api/test/support/fixed-clock.ts` and `sequential-ids.ts`
- [ ] T018 Implement typed config validated at boot in `apps/api/src/shared/config/app-config.ts`: fail fast if `DATABASE_URL`, `JWT_SECRET` (≥ 32 chars), `BUILTIN_KEY_SECRET` (≥ 32 chars) or `SEED_DEMO_PASSWORD` is missing; `OLLAMA_BASE_URL` and `AI_MODEL` are optional; `AGENT_SELECTION_MODE ∈ {auto, rules}`; `AI_TIMEOUT_MS` defaults to 10000; `SIMULATED_DECLINE_CENTS` is an integer 0–99 defaulting to 13
- [ ] T019 Create the TypeORM data source `apps/api/src/database/data-source.ts` (`synchronize: false`, migrations from `src/database/migrations/*`) and the yarn scripts `migrate` and `migrate:revert` in `apps/api/package.json`
- [ ] T020 Create migration `apps/api/src/database/migrations/0001-append-only-guard.ts`, defining the PL/pgSQL function `forbid_update_delete()` that raises an exception (research R14)
- [ ] T021 [P] Write a failing integration test for the audit log in `apps/api/test/integration/audit-log.spec.ts`: appended rows carry `correlation_id`; UPDATE and DELETE on `audit_events` raise an error
- [ ] T022 Create migration `0002-audit-events.ts` (columns per data-model "AuditEvent", `type` enum exactly `mandate.created`, `mandate.revoked`, `key.created`, `key.revoked`, `mandate.check.allowed`, `mandate.check.refused`, `checkout.attempted`, `payment.approved`, `payment.declined`, `order.placed`, `run.interrupted`, plus the append-only trigger), the `AuditLog` port `apps/api/src/shared/audit/audit-log.ts` and the adapter `apps/api/src/shared/audit/typeorm-audit-log.ts`, which writes through the caller's transaction manager
- [ ] T023 Wire `apps/api/src/main.ts` and `apps/api/src/app.module.ts`: global `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })`, the error filter, `cookie-parser`, the correlation middleware, the logger, `CqrsModule`, and Swagger at `/docs` and `/openapi.json`
- [ ] T024 [P] Write a failing contract test `apps/api/test/contract/health.contract.spec.ts`: `GET /health` returns 200 `{ status: "ok", db: "up", ai: "disabled" | "cold" | "warm" | "unavailable" }` and echoes `X-Correlation-Id`
- [ ] T025 Implement `apps/api/src/shared/http/health.controller.ts` (database ping; `ai` read from an `AiStatusPort` that returns `disabled` until Phase 3 adds the Ollama adapter)
- [ ] T026 Create `apps/api/scripts/export-openapi.ts` (boots the app module without listening and writes `apps/api/openapi.json`) and the web script `generate:api` (`openapi-typescript ../api/openapi.json -o src/api/schema.d.ts`); create `apps/web/src/api/client.ts` (`openapi-fetch`, `credentials: "include"`)
- [ ] T027 Create the contract-conformance helper `apps/api/test/support/openapi-contract.ts`. It loads `specs/001-agent-mandate-checkout/contracts/openapi.yaml` and asserts that a response body matches the named schema and that the generated `/openapi.json` declares the same `operationId`; every later contract test uses it

### Identity: demo users and sign-in (Slice 2)

- [ ] T028 [P] Write failing unit tests for `User` in `apps/api/src/identity/domain/user.spec.ts`: email is lower-cased and trimmed, `display_name` is 1–80 chars
- [ ] T029 [P] Write a failing integration test `apps/api/test/integration/user-repository.spec.ts`: `findByEmail` is case-insensitive; `email` is unique
- [ ] T030 Implement `apps/api/src/identity/domain/user.ts`, migration `0003-users.ts` (`id uuid pk`, `email text unique`, `display_name text`, `password_hash text`, `created_at timestamptz`), entity `apps/api/src/identity/infrastructure/user.entity.ts` and `typeorm-user-repository.ts`
- [ ] T031 [P] Write failing handler tests `apps/api/src/identity/application/login.handler.spec.ts`: a correct password returns the user id; an unknown email and a wrong password both raise `UNAUTHORIZED` with the same message
- [ ] T032 Implement the `PasswordHasher` port `apps/api/src/identity/domain/password-hasher.ts`, the argon2id adapter `apps/api/src/identity/infrastructure/argon2-password-hasher.ts` and `apps/api/src/identity/application/login.handler.ts` (`LoginCommand`)
- [ ] T033 [P] Write failing contract tests `apps/api/test/contract/auth.contract.spec.ts`: `POST /v1/auth/login` returns 204 and sets cookie `am_session` (httpOnly, SameSite=Lax, 8 h); bad credentials return 401; `GET /v1/me` returns 200 with the cookie and 401 without; `POST /v1/auth/logout` clears the cookie
- [ ] T034 Implement `apps/api/src/identity/infrastructure/http/auth.controller.ts`, `session.service.ts` (`@nestjs/jwt`, 8 h), `user-auth.guard.ts`, the `@CurrentUser()` decorator, `apps/api/src/identity/application/get-me.handler.ts` and `apps/api/src/identity/identity.module.ts`
- [ ] T035 Implement the idempotent seed runner `apps/api/src/database/seed/run-seed.ts` and `seed-users.ts` (`alice@demo.local` "Alice", `bob@demo.local` "Bob", both with the `SEED_DEMO_PASSWORD` hash); add yarn script `seed`

### Catalog data and seed (Slice 2)

- [ ] T036 [P] Write failing unit tests for `Product` in `apps/api/src/catalog/domain/product.spec.ts`: `price_minor > 0`, `stock >= 0`, currency `EUR`, `isInStock()`
- [ ] T037 Implement `apps/api/src/catalog/domain/{merchant,category,product}.ts` and migration `0004-catalog.ts`: `merchants(id, slug unique [a-z0-9-]+, name)`, `categories(id, slug unique, name)`, `products(id, merchant_id fk, category_id fk, item_ref text, name, description, price_minor integer check > 0, currency char(3), stock integer check >= 0, listed_at timestamptz)` with unique `(merchant_id, item_ref)`; entities in `apps/api/src/catalog/infrastructure/`
- [ ] T038 [P] Write a failing seed test `apps/api/test/integration/seed-catalog.spec.ts`: after seeding there are 2–3 merchants, about 5 categories (`audio`, `sports`, `home`, `books`, `kitchen`) and 30–50 products; at least 5 `item_ref`s are sold by two or more merchants at different prices; at least one product has `price_minor % 100 = 13`; at least one has `stock = 0`; running the seed twice changes nothing
- [ ] T039 Implement `apps/api/src/database/seed/seed-catalog.ts` (3 merchants: SoundHub, TechCorner, HomeGoods), including the item refs used by quickstart S2, and document them in `apps/api/src/database/seed/README.md`
- [ ] T040 [P] Write a failing contract test `apps/api/test/contract/categories.contract.spec.ts`: `GET /v1/categories` with a session returns every category (`Category` schema); without credentials returns 401
- [ ] T041 Implement `apps/api/src/catalog/application/list-categories.handler.ts`, `apps/api/src/catalog/infrastructure/http/categories.controller.ts` and `apps/api/src/catalog/catalog.module.ts`
- [ ] T042 [P] Write failing web tests `apps/web/src/features/auth/LoginPage.test.tsx`: submitting credentials calls `POST /v1/auth/login` and navigates to `/agents`; a 401 shows "Email or password is incorrect"; protected routes redirect to `/login` when `GET /v1/me` returns 401
- [ ] T043 Implement `apps/web/src/main.tsx`, `apps/web/src/routes.tsx` (protected layout), `apps/web/src/features/auth/LoginPage.tsx` and `apps/web/src/features/auth/useMe.ts`

**Checkpoint**: `yarn test` passes; `docker compose up -d db && yarn dev` serves the login
page, and Alice can sign in.

---

## Phase 3: User Story 1 - Delegate a purchase to an agent within a mandate (Priority: P1) 🎯 MVP

**Goal**: a user creates an agent with a mandate, starts a run with a plain-language request,
and the agent finds, compares and buys one eligible product through the public API without
further input. The resulting order is visible.

**Independent Test**: quickstart S1, S3, S4 and S6. Mandate (per-purchase cap 100.00 EUR,
total 150.00 EUR, category Audio, expiry tomorrow) + "wireless headphones" produces exactly
one Audio order ≤ 100.00 EUR, and the remaining budget drops by its price.

### Mandates core (Slice 3)

- [ ] T044 [P] [US1] Write failing unit tests for `Mandate` in `apps/api/src/mandates/domain/mandate.spec.ts`. Creation rejects: either cap `<= 0`; `per_purchase_cap_minor > total_budget_minor`; zero categories; `expires_at` not in the future. Each failure names its field. `remaining_minor = total_budget_minor - spent_minor`; `effective_limit_minor = min(per_purchase_cap_minor, remaining_minor)`; status order is `revoked_at != null → Revoked`, `now >= expires_at → Expired`, `remaining_minor == 0 → Exhausted`, else Active; `revoke()` is allowed only from Active and is final
- [ ] T045 [P] [US1] Write failing unit tests for `MandatePolicy.authorize(mandate, product, expectedPriceMinor, now)` in `apps/api/src/mandates/domain/mandate-policy.spec.ts`. It returns the first failing code in this order: `MANDATE_REVOKED`, `MANDATE_EXPIRED`, `MANDATE_EXHAUSTED`, `CATEGORY_NOT_ALLOWED`, `OUT_OF_STOCK`, `PRICE_CHANGED` (current ≠ expected), `OVER_PER_PURCHASE_CAP`, `OVER_REMAINING_BUDGET`. A price exactly equal to the limit is allowed; one cent over is refused (FR-024)
- [ ] T046 [P] [US1] Write failing unit tests for `MandateKey` in `apps/api/src/mandates/domain/mandate-key.spec.ts`. An `external` secret is `amk_` + 43 base64url chars from 32 random bytes. A `builtin` secret is `amk_` + base64url(HMAC-SHA256(`BUILTIN_KEY_SECRET`, mandate_id)), so the same input gives the same key. Only SHA-256 `key_hash` and `hint` (the last 4 chars) are kept
- [ ] T047 [US1] Implement `apps/api/src/mandates/domain/{agent,mandate,mandate-status,mandate-policy,mandate-key}.ts` until those tests pass
- [ ] T048 [US1] Create migration `apps/api/src/database/migrations/0005-mandates.ts` per data-model:
  - `agents(id, user_id fk, name text 1–60, created_at)`
  - `mandates(id, agent_id unique fk, user_id fk, per_purchase_cap_minor integer, total_budget_minor integer, spent_minor integer default 0, currency char(3), expires_at, revoked_at null, created_at)`, with checks `per_purchase_cap_minor > 0`, `total_budget_minor > 0`, `per_purchase_cap_minor <= total_budget_minor`, `spent_minor >= 0 AND spent_minor <= total_budget_minor`
  - `mandate_categories(mandate_id, category_id)`, primary key on both
  - `mandate_keys(id, mandate_id, kind enum builtin|external, key_hash bytea unique, hint text, label text null, created_at, revoked_at null)`
  - `mandate_activity(id, mandate_id, key_id, at, action enum search|view_product|view_mandate|checkout, result enum ok|refused|declined|error, detail jsonb, correlation_id)` with the append-only trigger
- [ ] T049 [P] [US1] Write failing integration tests `apps/api/test/integration/mandate-repository.spec.ts`: save and load keeps categories; `findByKeyHash` returns the mandate and key; the DB rejects `spent_minor > total_budget_minor`; `mandate_activity` rejects UPDATE and DELETE
- [ ] T050 [US1] Implement `apps/api/src/mandates/infrastructure/{agent,mandate,mandate-key,mandate-activity}.entity.ts`, `typeorm-mandate-repository.ts`, `typeorm-mandate-activity-log.ts` and the mappers between entities and domain objects
- [ ] T051 [P] [US1] Write failing handler tests `apps/api/src/mandates/application/create-agent.handler.spec.ts` (in-memory repos). It creates the agent, an Active mandate with `spent_minor = 0` and one `builtin` key, and records `mandate.created` in the audit log. An unknown category slug raises `VALIDATION_FAILED` with `details.categorySlugs`
- [ ] T052 [US1] Implement `apps/api/src/mandates/application/create-agent.handler.ts`, `list-agents.handler.ts`, `get-agent.handler.ts` and `get-mandate.handler.ts` (all scoped to the caller's `user_id`)
- [ ] T053 [P] [US1] Write failing contract tests `apps/api/test/contract/agents.contract.spec.ts`: `POST /v1/agents` (`CreateAgentRequest`) returns 201 `Agent` with `status: active` and `remaining = totalBudget`; invalid input returns 400 `VALIDATION_FAILED` with field details; `GET /v1/agents` returns only the caller's agents; `GET /v1/agents/{id}` for Bob's agent as Alice returns 404
- [ ] T054 [US1] Implement `apps/api/src/mandates/infrastructure/http/agents.controller.ts` with DTOs `create-agent.dto.ts` (class-validator: `name` 1–60, integer caps ≥ 1, `categorySlugs` non-empty unique, ISO `expiresAt`) and `agent.response.ts`, plus `apps/api/src/mandates/mandates.module.ts`
- [ ] T055 [P] [US1] Write failing contract tests `apps/api/test/contract/mandate-key-auth.contract.spec.ts` using `GET /v1/mandate`. A valid key returns 200 `Mandate`. Missing, unknown or revoked keys all return 401 with the same body. A key of an expired, revoked or exhausted mandate returns 409 with `MANDATE_EXPIRED`, `MANDATE_REVOKED` or `MANDATE_EXHAUSTED`. Each request writes one `mandate_activity` row (`view_mandate`, with the result)
- [ ] T056 [US1] Implement `apps/api/src/mandates/infrastructure/http/mandate-key.guard.ts` (Bearer → SHA-256 → `findByKeyHash`), the `@CurrentMandate()` decorator, `apps/api/src/mandates/infrastructure/http/activity.interceptor.ts` (writes one activity row per key request, with action, result and correlation id) and `own-mandate.controller.ts` (`GET /v1/mandate`)

### Catalog search for agents (Slice 4)

- [ ] T057 [P] [US1] Write failing unit tests for search scoring in `apps/api/src/catalog/domain/search-scoring.spec.ts`. The request is tokenized (lower-case, stop-words removed); score = 3 per name match + 2 per category match + 1 per description match; score 0 is excluded; results are ordered by score desc, then `price_minor` asc, then `listed_at` asc, then `id` asc
- [ ] T058 [P] [US1] Write failing unit tests for the eligibility hint in `apps/api/src/catalog/domain/eligibility.spec.ts`. Given a mandate snapshot, each product gets `{ eligible, reasonCode }` with `reasonCode ∈ {over_budget, category_not_allowed, out_of_stock, null}`. Over budget means `price_minor > min(per-purchase cap, remaining)`
- [ ] T059 [US1] Implement `apps/api/src/catalog/domain/search-scoring.ts` and `eligibility.ts`
- [ ] T060 [P] [US1] Write failing integration tests `apps/api/test/integration/product-search.spec.ts`: a token search over name, description and category returns matches from every merchant with merchant and category joined; the `category` filter and `limit` (1–50, default 20) work
- [ ] T061 [US1] Implement `apps/api/src/catalog/infrastructure/typeorm-product-repository.ts` (`search`, `findById`), `apps/api/src/catalog/application/search-catalog.handler.ts` and `get-product.handler.ts`
- [ ] T062 [P] [US1] Write failing contract tests `apps/api/test/contract/catalog.contract.spec.ts`: `GET /v1/catalog/search?q=headphones` with a key returns `Product` items plus `eligibility` and shows `merchant` (FR-025b); `GET /v1/catalog/products/{id}` returns the current price and stock, or 404; a session cookie alone returns 401; each call writes activity `search` / `view_product`
- [ ] T063 [US1] Implement `apps/api/src/catalog/infrastructure/http/catalog.controller.ts` (mandate-key guard + activity interceptor), and let `GET /v1/categories` also accept a mandate key

### Checkout (Slice 5)

- [ ] T064 [P] [US1] Write failing unit tests for `SimulatedPaymentGateway` in `apps/api/src/checkout/infrastructure/simulated-payment-gateway.spec.ts`: it declines when `amount_minor % 100 === SIMULATED_DECLINE_CENTS`, approves otherwise, and returns a unique `sim_` reference
- [ ] T065 [US1] Implement the `PaymentGatewayPort` `apps/api/src/checkout/domain/payment-gateway.port.ts` and `apps/api/src/checkout/infrastructure/simulated-payment-gateway.ts`
- [ ] T066 [US1] Create migration `apps/api/src/database/migrations/0006-checkout.ts` per data-model:
  - `payments(id, mandate_id, key_id, idempotency_key text, request_hash bytea, product_id, amount_minor integer > 0, currency char(3), outcome enum approved|declined, reference text unique, created_at)`, unique `(mandate_id, idempotency_key)`
  - `orders(id, user_id, mandate_id, merchant_id, product_id, run_id null, key_id, payment_id unique, product_name, merchant_name, unit_price_minor, quantity integer check = 1, total_minor, currency, status enum paid_simulated, placed_at)`
- [ ] T067 [P] [US1] Write failing handler tests `apps/api/src/checkout/application/checkout.handler.spec.ts` (in-memory unit of work):
  - an approved checkout creates one order (product, merchant, prices snapshotted; `quantity = 1`; `total = unit price`), increments `spent_minor` and decrements `stock`, and records `checkout.attempted`, `mandate.check.allowed`, `payment.approved` and `order.placed`
  - a decline creates no order, consumes no budget or stock, records `payment.declined` and raises `PAYMENT_DECLINED`
  - a policy refusal raises its code and records `mandate.check.refused`
  - a replay with the same `Idempotency-Key` and body returns the same order; the same key with a different body raises `IDEMPOTENCY_KEY_REUSED`
- [ ] T068 [US1] Implement `apps/api/src/checkout/application/checkout.handler.ts` (`CheckoutCommand { mandateId, keyId, productId, expectedPriceMinor, idempotencyKey, runId? }`) and `apps/api/src/checkout/domain/checkout-unit-of-work.port.ts`
- [ ] T069 [P] [US1] Write failing integration tests `apps/api/test/integration/checkout-transaction.spec.ts` against Postgres:
  - two concurrent checkouts whose sum exceeds the total budget: exactly one succeeds and the other gets `OVER_REMAINING_BUDGET` (FR-024a)
  - two concurrent checkouts of the last unit in stock: one succeeds, one gets `OUT_OF_STOCK`
  - 10 sequential replays of one idempotency key give 1 payment row and 1 order (SC-004)
- [ ] T070 [US1] Implement `apps/api/src/checkout/infrastructure/typeorm-checkout-unit-of-work.ts`: one transaction that `SELECT … FOR UPDATE` locks the mandate, then the product, runs `MandatePolicy.authorize`, looks up the idempotency key, charges the gateway, inserts the payment, order and audit rows, updates `spent_minor` and `stock`, and commits (research R12)
- [ ] T071 [P] [US1] Write failing contract tests `apps/api/test/contract/checkout.contract.spec.ts`: `POST /v1/checkout` with a key and `Idempotency-Key` (8–100 chars) returns 201 `Order` with `placedBy: builtin_agent | third_party_agent`; a missing header returns 400; a decline returns 402 `PAYMENT_DECLINED`; refusals return 409 with their codes; `X-Agent-Run-Id` is stored only for `builtin` keys
- [ ] T072 [US1] Implement `apps/api/src/checkout/infrastructure/http/checkout.controller.ts` (DTO `checkout.dto.ts`: `productId` uuid, `expectedPriceMinor` integer ≥ 1) and `apps/api/src/checkout/checkout.module.ts`
- [ ] T073 [P] [US1] Write failing contract tests `apps/api/test/contract/orders.contract.spec.ts`: `GET /v1/orders` returns the caller's orders newest first; `GET /v1/orders/{id}` returns `Order` with `runId`; another user's order returns 404
- [ ] T074 [US1] Implement `apps/api/src/checkout/application/list-orders.handler.ts`, `get-order.handler.ts` and `apps/api/src/checkout/infrastructure/http/orders.controller.ts`

### Agent run with rule-based selection (Slice 6)

- [ ] T075 [P] [US1] Write failing unit tests for `AgentRun` in `apps/api/src/agent/domain/agent-run.spec.ts`. The request is trimmed and must be 3–500 chars, else `INVALID_REQUEST`. It moves `running → completed` once, with one `outcome ∈ {order_placed, no_eligible_product, refused_by_mandate, payment_declined, invalid_request, interrupted}`, its `strategy`, its `fallback_reason` and `ended_at`. Log entries get `seq` 1, 2, 3… with no gaps
- [ ] T076 [P] [US1] Write failing unit tests for the candidate evaluator in `apps/api/src/agent/domain/candidate-evaluator.spec.ts`. Each search result becomes `kept` or `discarded` with `reasonCode ∈ {over_budget, category_not_allowed, out_of_stock, weaker_match, cheaper_offer_elsewhere}`. Of two eligible offers with the same `item_ref`, the more expensive one is discarded as `cheaper_offer_elsewhere` (FR-008a)
- [ ] T077 [P] [US1] Write failing unit tests for `RuleBasedSelector` in `apps/api/src/agent/domain/rule-based-selector.spec.ts`: it picks the highest-scoring kept candidate, with ties broken by lowest price, then earliest `listed_at`, then `id`; it returns null when nothing is kept; the same input always gives the same choice (FR-009a, SC-003a)
- [ ] T078 [P] [US1] Write failing unit tests for log messages in `apps/api/src/agent/domain/log-messages.spec.ts`. Messages are plain language and include merchant and formatted prices, e.g. `Discarded "Trail Buds Pro" from SoundHub: 129.00 EUR is over the 100.00 EUR per-purchase cap.` The comparison entry lists both offers
- [ ] T079 [US1] Implement `apps/api/src/agent/domain/{agent-run,run-log-entry,candidate-evaluator,rule-based-selector,log-messages}.ts` and the `ProductSelectorPort` `apps/api/src/agent/domain/product-selector.port.ts` (`select(request, keptCandidates) → { productId | null, reason, evaluations[], strategy, fallbackReason }`)
- [ ] T080 [US1] Create migration `apps/api/src/database/migrations/0007-agent-runs.ts`:
  - `agent_runs(id, mandate_id, user_id, request text, status enum running|completed, outcome enum null, strategy enum ai|rules null, fallback_reason enum not_configured|forced_rules|unavailable|timeout|api_error|unusable_answer|ineligible_choice null, order_id null, started_at, ended_at null, correlation_id)` with a partial unique index `(mandate_id) WHERE status = 'running'`
  - `run_log_entries(run_id, seq integer, at, step enum search|evaluation|selection|mandate_check|payment|outcome, message text, product_id null, data jsonb)`, primary key `(run_id, seq)`, with the append-only trigger
- [ ] T081 [P] [US1] Write failing integration tests `apps/api/test/integration/agent-run-repository.spec.ts`: a second `running` run for the same mandate violates the partial unique index; log entries come back in `seq` order; UPDATE and DELETE on `run_log_entries` raise an error
- [ ] T082 [US1] Implement `apps/api/src/agent/infrastructure/{agent-run,run-log-entry}.entity.ts` and `typeorm-agent-run-repository.ts`
- [ ] T083 [US1] Define the `StorePort` `apps/api/src/agent/domain/store.port.ts` (`getMandate`, `search`, `getProduct`, `checkout`, all with a mandate key) and an in-memory fake `apps/api/test/support/in-memory-store.ts` that applies the same `MandatePolicy`
- [ ] T084 [P] [US1] Write failing tests `apps/api/src/agent/infrastructure/http-store.adapter.spec.ts` against a local stub server: it calls `/v1/mandate`, `/v1/catalog/search` and `/v1/checkout` on `API_INTERNAL_BASE_URL` with `Authorization: Bearer <builtin key>`, `X-Correlation-Id`, `X-Agent-Run-Id` and `Idempotency-Key = runId`, and maps error bodies to typed codes
- [ ] T085 [US1] Implement `apps/api/src/agent/infrastructure/http-store.adapter.ts` (built-in `fetch`) and `apps/api/src/agent/infrastructure/builtin-key.provider.ts` (rebuilds the HMAC key per mandate)
- [ ] T086 [P] [US1] Write failing handler tests `apps/api/src/agent/application/start-run.handler.spec.ts`: a mandate that is not Active raises its `MANDATE_*` code (exhausted is shown to users as "Budget used up"); a second run while one is running raises `RUN_ALREADY_IN_PROGRESS`; a bad request raises `INVALID_REQUEST` and creates no run; success inserts a `running` run and publishes `RunStartedEvent`
- [ ] T087 [P] [US1] Write failing handler tests `apps/api/src/agent/application/run-executor.spec.ts` (in-memory store and repos, rules selector). Each case checks the outcome:
  - happy path: log steps `search → evaluation×n → selection → mandate_check → payment → outcome`, outcome `order_placed`, `order_id` set
  - no kept candidate: `no_eligible_product` with the reason in the log
  - a checkout refusal: `refused_by_mandate`
  - a decline: `payment_declined`
  - an unexpected error: run still completed and logged
- [ ] T088 [US1] Implement `apps/api/src/agent/application/start-run.handler.ts` and `apps/api/src/agent/application/run-executor.ts` (a `RunStartedEvent` handler, not awaited by the HTTP request; it logs agent id, mandate id, principal and outcome with the correlation id)
- [ ] T089 [P] [US1] Write a failing test `apps/api/src/agent/application/interrupted-runs.recovery.spec.ts`: on boot, every `running` run becomes `completed` with outcome `interrupted`, a final `outcome` log entry and audit `run.interrupted`
- [ ] T090 [US1] Implement `apps/api/src/agent/application/interrupted-runs.recovery.ts` (`OnApplicationBootstrap`)
- [ ] T091 [P] [US1] Write failing contract tests `apps/api/test/contract/runs.contract.spec.ts`. `POST /v1/mandates/{id}/runs` returns 202 `Run` (`status: running`), then polling `GET /v1/runs/{id}` reaches `completed` with `order_placed` within 30 s (SC-002). Errors: 409 `RUN_ALREADY_IN_PROGRESS`, 409 `MANDATE_EXHAUSTED`, 422 `INVALID_REQUEST`. `GET /v1/mandates/{id}/runs` lists newest first. Bob gets 404 on Alice's run
- [ ] T092 [US1] Implement `apps/api/src/agent/infrastructure/http/runs.controller.ts`, `get-run.handler.ts`, `list-runs.handler.ts` and `apps/api/src/agent/agent.module.ts`

### Local AI selection (Slice 8)

- [ ] T093 [P] [US1] Write failing unit tests for the AI prompt and schema in `apps/api/src/agent/infrastructure/ai/ai-selection.schema.spec.ts`:
  - the zod schema `{ chosenProductId: string | null, reason: string, evaluations: { productId, verdict: "kept" | "discarded", reason }[] }` converts with `z.toJSONSchema`
  - the prompt contains only the request and each kept candidate's id, merchant name, name, description, category and price; no stock, keys or user data
  - the prompt asks for reasons of at most 15 words
- [ ] T094 [P] [US1] Write failing tests `apps/api/src/agent/infrastructure/ai/ollama-product-selector.spec.ts` against a stub HTTP server. It sends `POST /api/chat` with `stream: false`, `think: false`, `options.temperature: 0`, `keep_alive: "30m"` and `format` = the JSON schema. Expected fallbacks:
  - connection refused: `unavailable`
  - no answer within `AI_TIMEOUT_MS` (100 ms in the test): `timeout`
  - HTTP 404: `api_error`
  - output that fails the schema: `unusable_answer`
  - a chosen id outside the candidates: `ineligible_choice`
  A valid answer returns `strategy: ai`. Candidates missing from `evaluations` get the rule-based verdict, marked `notEvaluatedByAi: true`
- [ ] T095 [US1] Implement `apps/api/src/agent/infrastructure/ai/ai-selection.schema.ts`, `prompt.ts` and `ollama-product-selector.ts` (built-in `fetch`, `AbortSignal.timeout(AI_TIMEOUT_MS)`, no retries)
- [ ] T096 [P] [US1] Write failing tests `apps/api/src/agent/application/selection.service.spec.ts`:
  - `AGENT_SELECTION_MODE=rules` gives rules with `forced_rules`
  - `OLLAMA_BASE_URL` or `AI_MODEL` unset gives rules with `not_configured`
  - otherwise the AI is used, and any AI fallback runs the rules selector with that fallback reason
  - the run's `strategy` and `fallback_reason` are persisted (FR-009b)
- [ ] T097 [US1] Implement `apps/api/src/agent/application/selection.service.ts` and wire it into `run-executor.ts`; the selection log entry states the strategy and, on fallback, its cause
- [ ] T098 [P] [US1] Write failing tests `apps/api/src/agent/infrastructure/ai/ollama-warmup.spec.ts`: at boot it sends one background request with `keep_alive: "30m"` (never blocks startup); `AiStatusPort` reports `warm` when `GET /api/ps` lists `AI_MODEL`, `cold` when not, `unavailable` on connection error, `disabled` when not configured
- [ ] T099 [US1] Implement `apps/api/src/agent/infrastructure/ai/ollama-warmup.ts` and `ollama-ai-status.adapter.ts`, bound to `AiStatusPort` so `/health` reports the AI state

### Web: agents, runs and orders (Slice 9)

- [ ] T100 [US1] Run `yarn workspace api export:openapi && yarn workspace web generate:api` and commit the updated `apps/web/src/api/schema.d.ts` (generated, outside the PR budget)
- [ ] T101 [P] [US1] Write failing tests `apps/web/src/features/agents/money.test.ts`: euro input strings convert to integer cents exactly (`"89.99"` → `8999`, `"100"` → `10000`; `"1.234"` and `"-1"` are rejected); formatting gives `"89.99 EUR"`
- [ ] T102 [P] [US1] Write failing tests `apps/web/src/features/agents/CreateAgentForm.test.tsx`. Fields: name, per-purchase cap (EUR), total budget (EUR), categories (multi-select from `GET /v1/categories`), expiry (date-time). Client-side errors cover a cap ≤ 0, per-purchase above total, no category and an expiry in the past. Server `VALIDATION_FAILED` details show on the matching field, and success adds the agent to the list
- [ ] T103 [P] [US1] Write failing tests `apps/web/src/features/agents/AgentsPage.test.tsx`: each agent shows status (active, exhausted, expired, revoked), per-purchase cap, total, spent, remaining, categories and expiry
- [ ] T104 [US1] Implement `apps/web/src/features/agents/money.ts`, `CreateAgentForm.tsx`, `AgentsPage.tsx` and `useAgents.ts` with shadcn/ui `Form`, `Input`, `Select`, `Card` and `Badge`
- [ ] T105 [P] [US1] Write failing tests `apps/web/src/features/runs/StartRunForm.test.tsx`: the request field (3–500 chars) starts a run and navigates to `/runs/{id}`; `RUN_ALREADY_IN_PROGRESS`, `MANDATE_*` (exhausted shown as "Budget used up") and `INVALID_REQUEST` show plain-language messages
- [ ] T106 [P] [US1] Write failing tests `apps/web/src/features/runs/RunPage.test.tsx`. While running it polls `GET /v1/runs/{id}` every 1 s. When completed it shows the outcome label, the strategy (AI or rules, plus the fallback reason) and, for `order_placed`, the order summary with product, merchant, price and a link to the order
- [ ] T107 [US1] Implement `apps/web/src/features/runs/StartRunForm.tsx`, `RunPage.tsx` and `useRun.ts`
- [ ] T108 [P] [US1] Write failing tests `apps/web/src/features/orders/OrdersPage.test.tsx` and `OrderDetailPage.test.tsx`: the list shows product, merchant, total, status "Paid (simulated)", time and who placed it; the detail links to its run
- [ ] T109 [US1] Implement `apps/web/src/features/orders/OrdersPage.tsx`, `OrderDetailPage.tsx` and `useOrders.ts`, and add the routes in `apps/web/src/routes.tsx`

**Checkpoint**: US1 is fully functional on its own. Validate with quickstart S1, S3, S4 and
S6 and the full gate.

---

## Phase 4: User Story 2 - Understand why the agent bought what it bought (Priority: P2)

**Goal**: the user reads a plain-language, step-by-step decision log for every run, and
watches it fill in live while the run is in progress.

**Independent Test**: quickstart S2. A request matching offers from several merchants
(some over budget, some out of category) shows every considered product with its merchant
and reason, entries appear live, and a reload mid-run resumes without duplicates.

### Decision log read and live stream (Slice 7)

- [ ] T110 [P] [US2] Write failing contract tests `apps/api/test/contract/run-log.contract.spec.ts`: `GET /v1/runs/{id}/log` returns `LogEntry[]` in `seq` order with `step`, `message` and `data` (`verdict`, `reasonCode`, `merchant`, `priceMinor` on evaluation entries); a run without an order still has a full log ending in `outcome` (FR-017); another user's run returns 404
- [ ] T111 [US2] Implement `apps/api/src/agent/application/get-run-log.handler.ts` and the route in `runs.controller.ts`
- [ ] T112 [P] [US2] Write failing unit tests `apps/api/src/agent/infrastructure/run-log.publisher.spec.ts`: an entry is published to per-run subscribers only after its transaction commits; subscribers to other runs receive nothing
- [ ] T113 [US2] Implement `apps/api/src/agent/infrastructure/run-log.publisher.ts` (in-process, on the CQRS event bus) and publish from `run-executor.ts` after each append and at completion
- [ ] T114 [P] [US2] Write failing contract tests `apps/api/test/contract/run-events.contract.spec.ts` per `contracts/run-events.md`:
  - a fresh connect during a run gets `log` events 1…n in order, then `run.completed`
  - a reconnect with `Last-Event-ID: k` gets exactly k+1…n
  - a completed run gives the full replay, then `run.completed`, then the stream closes
  - `: ping` arrives every 15 s
  - another user's run returns 404 before the stream opens
  - each live event arrives less than 1 s after its row is written (SC-002a)
- [ ] T115 [US2] Implement `apps/api/src/agent/infrastructure/http/run-events.controller.ts` (`@Sse()` on `GET /v1/runs/{id}/events`: replay `seq > Last-Event-ID`, then live, with no gap or duplicate)

### Web: live decision log (Slice 7)

- [ ] T116 [P] [US2] Write failing tests `apps/web/src/features/runs/useRunEvents.test.ts` with a mocked `EventSource`: entries are added in `seq` order; a duplicate `seq` after a reconnect is ignored; `run.completed` updates the run and closes the source
- [ ] T117 [P] [US2] Write failing tests `apps/web/src/features/runs/DecisionLog.test.tsx`. Each entry shows time, a step label (Search, Evaluation, Selection, Mandate check, Payment, Outcome) and the message. Evaluation entries show a Kept or Discarded badge with merchant and price. Entries marked `notEvaluatedByAi` show "rule-based verdict"
- [ ] T118 [US2] Implement `apps/web/src/features/runs/useRunEvents.ts` and `DecisionLog.tsx`; in `RunPage.tsx`, replace polling with the live stream and show the log under the outcome
- [ ] T119 [US2] Add a "Decision log" link on `apps/web/src/features/orders/OrderDetailPage.tsx` that opens `/runs/{runId}` (US2 scenario 1)

**Checkpoint**: US1 and US2 both work. Validate with quickstart S2.

---

## Phase 5: User Story 3 - Keep control over the agent (Priority: P3)

**Goal**: the user sees every agent's mandate status and remaining budget and can revoke a
mandate at any time, including during a run, with immediate effect.

**Independent Test**: quickstart S5. A revoked mandate refuses new runs, and a revoke
during a run blocks its checkout, so no order is created and the log records the refusal.

### Revoke (Slice 10a)

- [ ] T120 [P] [US3] Write failing handler tests `apps/api/src/mandates/application/revoke-mandate.handler.spec.ts`: Active → Revoked sets `revoked_at` once, revokes every key of the mandate and records `mandate.revoked`; revoking an expired, exhausted or already revoked mandate raises `MANDATE_NOT_ACTIVE`; another user's mandate raises `NOT_FOUND`
- [ ] T121 [US3] Implement `apps/api/src/mandates/application/revoke-mandate.handler.ts`
- [ ] T122 [P] [US3] Write failing contract tests `apps/api/test/contract/revoke-mandate.contract.spec.ts`: `POST /v1/mandates/{id}/revoke` returns 200 `Mandate` with `status: revoked`; a second call returns 409 `MANDATE_NOT_ACTIVE`; afterwards `POST /v1/mandates/{id}/runs` returns 409 `MANDATE_REVOKED`, and the mandate's key gets 409 `MANDATE_REVOKED` on `GET /v1/mandate`
- [ ] T123 [US3] Add the revoke route to `apps/api/src/mandates/infrastructure/http/agents.controller.ts` (or a new `mandates.controller.ts` if `agents.controller.ts` exceeds 200 lines)
- [ ] T124 [P] [US3] Write a failing integration test `apps/api/test/integration/revoke-during-run.spec.ts`: a run whose selector is paused before checkout, a revoke, then the selector resumes; expect outcome `refused_by_mandate`, no order, and a `mandate_check` log entry saying the mandate was revoked
- [ ] T125 [US3] Make the test above pass. The checkout transaction already re-checks the mandate; ensure `apps/api/src/agent/application/run-executor.ts` maps `MANDATE_REVOKED` and `MANDATE_EXPIRED` from checkout to `refused_by_mandate` with a plain-language log message

### Web: status and revoke (Slice 10a)

- [ ] T126 [P] [US3] Write failing tests `apps/web/src/features/agents/RevokeMandateButton.test.tsx`: the button is shown only for active mandates and opens a shadcn `AlertDialog` (no browser `confirm`); confirming calls revoke and updates the badge to Revoked; the start-run form is disabled for non-active mandates and states why
- [ ] T127 [US3] Implement `apps/web/src/features/agents/RevokeMandateButton.tsx` and wire it into `AgentsPage.tsx` and the start-run form

**Checkpoint**: US1–US3 work. Validate with quickstart S5.

---

## Phase 6: User Story 4 - Let a third-party AI agent shop under a mandate (Priority: P4)

**Goal**: the user creates an access key for a mandate, and any AI assistant connects to the
published MCP tool interface and shops under exactly the same mandate rules. The user sees
the orders and the agent's activity.

**Independent Test**: quickstart S7. A scripted MCP client holding only the URL and a key
lists tools, searches, buys an in-budget product (order visible to the user, activity
logged), is refused over the per-purchase cap, and gets 401 after the key is revoked.

### Access keys and activity (Slice 10b)

- [ ] T128 [P] [US4] Write failing handler tests `apps/api/src/mandates/application/mandate-keys.handlers.spec.ts`. Create returns the secret once and records `key.created`; it is refused with `MANDATE_NOT_ACTIVE` when the mandate is not Active. List returns `external` keys only, masked as `amk_…abcd`. Revoke sets `revoked_at` and records `key.revoked`
- [ ] T129 [US4] Implement `apps/api/src/mandates/application/create-mandate-key.handler.ts`, `list-mandate-keys.handler.ts` and `revoke-mandate-key.handler.ts`
- [ ] T130 [P] [US4] Write failing contract tests `apps/api/test/contract/mandate-keys.contract.spec.ts`: `POST /v1/mandates/{id}/keys` returns 201 `CreatedMandateKey` with `secret`; `GET` returns `MandateKey[]` with no secret; `POST …/keys/{keyId}/revoke` returns 200 and the key then gets 401; Bob gets 404 on Alice's mandate
- [ ] T131 [US4] Implement `apps/api/src/mandates/infrastructure/http/mandate-keys.controller.ts` with DTO `create-mandate-key.dto.ts` (`label` max 60, optional)
- [ ] T132 [P] [US4] Write failing contract tests `apps/api/test/contract/mandate-activity.contract.spec.ts`: `GET /v1/mandates/{id}/activity?keyKind=external` returns `ActivityEntry[]` oldest first with action, result and detail, and excludes `builtin` entries when filtered
- [ ] T133 [US4] Implement `apps/api/src/mandates/application/list-mandate-activity.handler.ts` and its route in `mandate-keys.controller.ts`

### MCP tool interface (Slice 11)

- [ ] T134 [P] [US4] Write failing contract tests `apps/api/test/contract/mcp.contract.spec.ts` using the MCP SDK `Client` + `StreamableHTTPClientTransport` against `POST /mcp`:
  - `tools/list` returns exactly `search_catalog`, `get_product`, `get_mandate` and `checkout`, with input schemas per `contracts/mcp-tools.md`
  - each tool succeeds with a valid key and writes one activity row
  - `checkout` over the per-purchase cap returns `isError: true` with `structuredContent.error.code = OVER_PER_PURCHASE_CAP` and creates no order
  - a `checkout` replay with the same `idempotencyKey` returns the same order (1 payment row)
  - an unknown or revoked key gets HTTP 401
  - a key of an expired, revoked or exhausted mandate gets a `MANDATE_*` error
- [ ] T135 [US4] Implement `apps/api/src/mcp/mcp.module.ts` and `apps/api/src/mcp/mcp.controller.ts`: a stateless `McpServer` with `StreamableHTTPServerTransport`, one server per request, protected by the mandate-key guard and activity interceptor
- [ ] T136 [US4] Implement `apps/api/src/mcp/tools/{search-catalog,get-product,get-mandate,checkout}.tool.ts`. Each has a zod input schema (`query` 1–200, `category` optional, `limit` 1–50 default 20; `productId` uuid; `expectedPriceMinor` integer ≥ 1; `idempotencyKey` 8–100) and dispatches the same query or command as the HTTP endpoints. Descriptions state cents/EUR units, that limits come from the mandate, and the idempotency retry rule. Domain errors map to `isError` results
- [ ] T137 [US4] Implement the scripted third-party agent `apps/api/scripts/mcp-demo.ts` (args `--url`, `--key`; lists tools, searches, checks out the cheapest eligible result, then tries a product over the cap and prints the refusal) and the yarn script `mcp:demo`

### Web: keys and activity (Slice 10b)

- [ ] T138 [P] [US4] Write failing tests `apps/web/src/features/agents/KeysPanel.test.tsx`: create shows the secret once with a copy button and a "you won't see it again" notice; after closing, only `amk_…abcd` hints remain; revoke uses an `AlertDialog`; the panel is hidden for non-active mandates
- [ ] T139 [P] [US4] Write failing tests `apps/web/src/features/agents/ActivityPanel.test.tsx`: it lists external activity (time, action, result, detail) newest at the bottom; it shows an empty state when there is none
- [ ] T140 [US4] Implement `apps/web/src/features/agents/KeysPanel.tsx`, `ActivityPanel.tsx` and an agent detail route `/agents/{id}` that hosts them; the order list shows "Third-party agent" for `placedBy: third_party_agent`

**Checkpoint**: all four stories work on their own. Validate with quickstart S7.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: success-criteria sweeps, observability checks, docs and the final gate.

- [ ] T141 [P] Write and pass `apps/api/test/sweep/mandate-compliance.sweep.spec.ts` (SC-003, SC-003a). It runs at least 20 scripted runs with rules forced, covering in-budget, over per-purchase cap, over remaining budget, wrong category, exhausted, expired, revoked and declined. It asserts 0 orders that break their mandate, then reruns the whole set and asserts identical choices and outcomes. Add yarn script `test:sweep`
- [ ] T142 [P] Write and pass `apps/api/test/contract/mcp-discovery.contract.spec.ts` (SC-004a): a client given only the URL and a key completes a purchase using nothing but `tools/list` output
- [ ] T143 [P] Write and pass `apps/api/test/integration/correlation-propagation.spec.ts` (Principle V). One run's `X-Correlation-Id` appears on the run row, every log entry's request context, the built-in agent's loopback calls, the activity rows and the audit rows; captured logs contain no `amk_` secret, cookie or password
- [ ] T144 [P] Write and pass `apps/api/test/integration/ai-fallback-timing.spec.ts` (SC-003b) with a stub AI that never answers: runs still finish via rules in under 30 s with `fallback_reason: timeout`
- [ ] T145 Write the root `README.md` (setup, `yarn dev`, demo accounts, Ollama warm-up, gate commands, link to quickstart), run it through the humanizer skill, and keep it consistent with `specs/001-agent-mandate-checkout/quickstart.md`
- [ ] T146 Run the full gate `yarn typecheck && yarn lint && yarn test && yarn build` and paste its output
- [ ] T147 Run quickstart scenarios S1–S9 manually against `yarn dev` with Ollama warm, and record pass/fail per scenario in the PR description of the last slice

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies
- **Foundational (Phase 2)**: depends on Setup and blocks every user story
- **US1 (Phase 3)**: depends on Foundational. This is the MVP
- **US2 (Phase 4)**: depends on US1's agent run (it reads the logs US1 writes)
- **US3 (Phase 5)**: depends on US1's mandates and checkout; independent of US2
- **US4 (Phase 6)**: depends on US1's mandate-key guard, catalog and checkout; independent of
  US2 and US3
- **Polish (Phase 7)**: depends on every story you intend to ship

### User Story Dependencies

```text
Setup → Foundational → US1 ─┬─▶ US2
                            ├─▶ US3
                            └─▶ US4 ──▶ Polish (sweeps need US3 revoke + US4 MCP)
```

### Delivery slices (stacked PRs, plan.md)

```text
Slice 1  foundation   (Phase 1 + shared kernel)            → main
Slice 2  identity + catalog data (rest of Phase 2)         → slice 1
Slice 3  mandates core (US1)                               → slice 2
Slice 4  catalog agent search (US1)                        → slice 3
Slice 5  checkout (US1)                                    → slice 4
Slice 6  agent run, rules (US1)                            → slice 5
Slice 8  local AI selection (US1)                          → slice 6
Slice 9  web: agents, runs, orders (US1)                   → slice 8
Slice 7  decision log + SSE + live web (US2)               → slice 9
Slice 10a revoke (US3)                                     → slice 7
Slice 10b keys + activity (US4)                            → slice 10a
Slice 11 MCP (US4) + polish                                → slice 10b
```

Slice 7 lands after slice 9 because its live web view replaces the polling `RunPage` built in
slice 9.

### Within Each Story

- Failing test first, then the implementation that makes it pass (Principle II)
- Domain, then persistence, then handlers, then HTTP/MCP adapters, then web
- Commit after each test-then-implementation pair, and run the gate before every commit

### Parallel Opportunities

- Setup: T002, T003, T005, T006 and T007 can run in parallel after T001 and T004
- Foundational: every `[P]` test task in the shared kernel can be written at the same time;
  the identity and catalog tracks can run in parallel
- US1: the domain test tasks within one slice (e.g. mandate, policy and key tests) run in
  parallel; the web tests for agents, runs and orders run in parallel
- After US1, US2, US3 and US4 can be built in parallel by different people

---

## Parallel Example: User Story 1

```bash
# Slice 3 – write the mandate domain tests together (all fail first):
Task: "Failing unit tests for Mandate in apps/api/src/mandates/domain/mandate.spec.ts"
Task: "Failing unit tests for MandatePolicy in apps/api/src/mandates/domain/mandate-policy.spec.ts"
Task: "Failing unit tests for MandateKey in apps/api/src/mandates/domain/mandate-key.spec.ts"

# Slice 6 – agent domain tests together:
Task: "Failing unit tests for AgentRun in apps/api/src/agent/domain/agent-run.spec.ts"
Task: "Failing unit tests for candidate evaluator in apps/api/src/agent/domain/candidate-evaluator.spec.ts"
Task: "Failing unit tests for RuleBasedSelector in apps/api/src/agent/domain/rule-based-selector.spec.ts"
Task: "Failing unit tests for log messages in apps/api/src/agent/domain/log-messages.spec.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: Setup
2. Phase 2: Foundational (blocks everything)
3. Phase 3: US1, slices 3 → 4 → 5 → 6 → 8 → 9
4. **Stop and validate** with quickstart S1, S3, S4 and S6. The demo already shows an agent
   buying within a mandate

### Incremental Delivery

1. Setup + Foundational: you can sign in and the catalog is seeded
2. US1: agent purchase with AI or rules (MVP demo)
3. US2: live decision log, which makes the demo trustworthy
4. US3: revoke and status, which shows the user stays in control
5. US4: third-party agents over MCP, which shows the store is open to any agent
6. Polish: success-criteria sweeps and docs

---

## Notes

- `[P]` tasks touch different files and have no dependency on unfinished tasks
- Each `*.spec.ts` / `*.test.tsx` task must be run and seen failing before its implementation task
- Generated files (`apps/web/src/api/schema.d.ts`, `apps/api/openapi.json`) and migrations
  don't count toward the PR budget
- No live AI calls in any automated test: stub HTTP servers or `AGENT_SELECTION_MODE=rules`
- The repository is not a git repository yet; initialize it (and create branch
  `001-agent-mandate-checkout`) before the first slice
