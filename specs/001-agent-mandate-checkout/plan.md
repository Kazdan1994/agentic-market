# Implementation Plan: Agent Mandate Checkout

**Branch**: `001-agent-mandate-checkout` | **Date**: 2026-10-22 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-agent-mandate-checkout/spec.md`

## Summary

A signed-in user creates a shopping agent with a mandate: a per-purchase cap, a total budget,
allowed categories and an expiry. The agent searches a multi-merchant demo catalog,
compares offers, picks one product (an AI model by default, rule-based as the fallback),
and checks out with a simulated payment. The user watches the decision log fill in live.
Third-party AI assistants can shop under the same mandate through a published MCP tool
interface.

**Technical approach**:

- **Backend**: a NestJS 12 modular monolith with hexagonal bounded contexts (`identity`,
  `catalog`, `mandates`, `checkout`, `agent`) and CQRS.
- **Storage**: PostgreSQL through TypeORM.
- **Outside customer**: the built-in agent reaches the store only through its own public
  HTTP API with a system-issued mandate key (R8).
- **Safety**: the budget is enforced inside one locking transaction with idempotency keys
  (R12).
- **Live view**: run updates stream to the browser over Server-Sent Events with replay
  (R6).
- **Frontend**: a Vite + React app consuming a client generated from the OpenAPI document.

## Technical Context

**Language/Version**: TypeScript (strict) on Node 26

**Primary Dependencies**:

- API: NestJS 12 with `@nestjs/cqrs`, `@nestjs/typeorm`, `@nestjs/swagger` and
  `@nestjs/jwt`; TypeORM 1.1; class-validator; `@modelcontextprotocol/sdk` 1.32;
  zod 4 (MCP and AI schemas only); nestjs-pino
- AI: a local Ollama model (`gemma4:e2b` by default) called over its native HTTP API with
  built-in `fetch`, with no AI SDK (R5)
- Web: Vite 8, React 19, React Router 8, TanStack Query 5, Tailwind 4, shadcn/ui,
  openapi-fetch

**Storage**: PostgreSQL 18 (Docker Compose), with schema changes through TypeORM
migrations only

**Testing**: Vitest 5 (API via `unplugin-swc`), `@testcontainers/postgresql`, supertest,
and Testing Library for React

**Target Platform**: a local developer machine (macOS/Linux) with Docker; latest desktop
Chrome/Firefox/Safari

**Project Type**: a web application (API + SPA) in one Yarn 4 workspaces repository

**Performance Goals**: each run reaches its outcome in under 30 s (SC-002); each live log
entry is on screen within 1 s (SC-002a); the AI decision has a 10 s timeout (FR-009a)

**Constraints**: no real money (FR-012); amounts are integer cents; budget safe under
concurrency (FR-024a); append-only logs (FR-020); no live AI calls in tests. The AI runs
locally, so no data leaves the machine; a cold model load (40–50 s measured) exceeds the
10 s limit and falls back to rules, so the API pre-warms the model at boot (R5)

**Scale/Scope**: a handful of concurrent users; 30–50 products from 2–3 merchants;
4 user stories; 20 HTTP paths (about 22 operations), 1 SSE stream and 4 MCP tools;
5 web screens

All Technical Context unknowns are resolved in [research.md](./research.md) (R1–R16).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principle | Pre-research | Post-design | Evidence |
|---|---|---|---|---|
| I | Hexagonal + CQRS | PASS | PASS | Five bounded contexts, each with `domain/ application/ infrastructure/`. The domain imports no framework. Ports: `ProductRepository`, `MandateRepository`, `PaymentGatewayPort`, `StorePort`, `ProductSelectorPort`, `Clock`, `IdGenerator`. Commands return IDs/acks; queries are read-only. Contexts talk via commands, queries and events, or HTTP for `agent` → store (R8). |
| II | Test-first (non-negotiable) | PASS | PASS | Test layers defined in R4. `tasks.md` must order the test before the implementation for every behaviour. Persistence tests use real Postgres via Testcontainers. Contract tests cover every endpoint, the SSE stream and every MCP tool. |
| III | API- and agent-first contracts | PASS | PASS | [contracts/openapi.yaml](./contracts/openapi.yaml) with a typed error-code enum. The web app uses only a client generated from OpenAPI (R9). MCP ([contracts/mcp-tools.md](./contracts/mcp-tools.md)) adapts the same handlers. The built-in agent goes through the public API itself. Everything is under `/v1`. |
| IV | Security and money safety | PASS | PASS | Session cookie or mandate-key guard on every route except `/health` and the API docs, which constitution 1.1.0 exempts. Keys are SHA-256 hashed and shown once. Mandate: caps, categories, expiry. Integer cents. `Idempotency-Key` with a unique constraint. Lock + DB check constraints for the budget. Append-only audit (R14). class-validator on HTTP and zod on MCP/AI inputs. Simulated gateway only. Secrets in `.env.local`. |
| V | Observability | PASS | PASS | JSON logs with a correlation ID propagated through commands, events, loopback calls, log entries and audit rows (R15). Agent ID, principal, mandate ID and outcome are logged for every run and checkout. Redaction for keys, cookies and passwords. Typed error codes to clients, no stack traces. |
| VI | Simplicity and YAGNI | PASS* | PASS* | One API and one SPA. No queue, broker or microservices (R7). Ports only at real boundaries. *Two validation libraries are justified below. The PR budget is handled by stacked slices (see Delivery Slices). |

**Gate result**: PASS. The one deviation is recorded in Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/001-agent-mandate-checkout/
├── plan.md              # This file
├── research.md          # Phase 0: decisions R1–R16
├── data-model.md        # Phase 1: entities, states, constraints
├── quickstart.md        # Phase 1: validation scenarios S1–S9
├── contracts/
│   ├── openapi.yaml     # HTTP API (user + agent endpoints)
│   ├── run-events.md    # SSE stream contract
│   └── mcp-tools.md     # MCP tool interface
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks, not created here)
```

### Source Code (repository root)

```text
package.json                    # yarn workspaces: apps/*
docker-compose.yml              # postgres
.env.example                    # tracked template; real values in .env.local (untracked)
.nvmrc                          # 26

apps/api/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── shared/                 # correlation (AsyncLocalStorage), logger config, error
│   │                           #   filter + codes, Money value object, Clock/IdGenerator ports
│   ├── identity/               # users, login, session guard
│   │   ├── domain/  application/  infrastructure/
│   ├── catalog/                # merchants, categories, products, search
│   │   ├── domain/  application/  infrastructure/
│   ├── mandates/               # agents, mandates, keys, key guard, activity log
│   │   ├── domain/  application/  infrastructure/
│   ├── checkout/               # checkout transaction, simulated gateway, orders, audit
│   │   ├── domain/  application/  infrastructure/
│   ├── agent/                  # runs, rule-based + AI selectors, decision log, SSE
│   │   ├── domain/  application/  infrastructure/
│   ├── mcp/                    # MCP server adapter -> catalog/mandates/checkout handlers
│   └── database/
│       ├── migrations/
│       └── seed/               # merchants, categories, 30-50 products, demo users
├── test/
│   ├── contract/               # supertest + SSE + MCP client, booted app + Testcontainers
│   ├── integration/            # TypeORM adapters against Postgres
│   └── sweep/                  # SC-003/SC-003a scripted 20+ run sweep
├── scripts/
│   └── mcp-demo.ts             # scripted third-party agent (quickstart S7, SC-004a)
└── vitest.config.ts            # unit + handler tests live next to sources (*.spec.ts)

apps/web/
├── src/
│   ├── api/                    # schema.d.ts (generated from openapi.json) + openapi-fetch client
│   ├── components/ui/          # shadcn/ui components (generated by the shadcn CLI)
│   ├── features/
│   │   ├── auth/               # login screen
│   │   ├── agents/             # agent list + create-agent/mandate form + revoke + keys
│   │   ├── runs/               # start run + live run view (EventSource) + decision log
│   │   └── orders/             # order list + order detail (link to run log)
│   ├── routes.tsx
│   └── main.tsx
└── vitest.config.ts
```

**Structure decision**: a web application split into `apps/api` and `apps/web` under yarn
workspaces. There is no shared package, since the OpenAPI document is the only bridge
between the apps. Each API bounded context is a NestJS module with hexagonal sub-folders.
`mcp/` is a pure adapter module with no domain of its own.

## Bounded contexts and key flows

| Context | Owns | Exposes |
|---|---|---|
| identity | User | `LoginCommand`, `GetMeQuery`, `UserAuthGuard` |
| catalog | Merchant, Category, Product | `SearchCatalogQuery`, `GetProductQuery`, `ListCategoriesQuery`; `ReserveStock` inside the checkout transaction through a port |
| mandates | Agent, Mandate, MandateCategory, MandateKey, MandateActivityEntry | `CreateAgentCommand`, `RevokeMandateCommand`, `CreateMandateKeyCommand`, `RevokeMandateKeyCommand`, `GetMandateQuery`, `MandatePolicy` (domain), `MandateKeyGuard` |
| checkout | Payment, Order, AuditEvent | `CheckoutCommand`, `ListOrdersQuery`, `GetOrderQuery` |
| agent | AgentRun, RunLogEntry | `StartRunCommand`, `GetRunQuery`, `GetRunLogQuery`, `RunEventsStream`; uses `StorePort` (HTTP) and `ProductSelectorPort` (AI or rules) |

**Checkout transaction** (R12), the single place where money moves:
lock mandate → lock product → `MandatePolicy.authorize` → idempotency lookup →
`PaymentGatewayPort.charge` → insert payment, order and audit → update `spent_minor` and
`stock` → commit.

**Agent run** (R7, R8, R5):

1. `StartRunCommand` → insert the run → `202`.
2. `RunStartedEvent` → `StorePort.getMandate` → `StorePort.search`.
3. Evaluate the eligibility of each result → log entries.
4. `ProductSelectorPort.select` (AI with a 10 s timeout, or the rules) → validate the
   choice is eligible → log entry.
5. `StorePort.checkout` with `Idempotency-Key = runId` → log entry → outcome →
   `run.completed`.

## Delivery slices (stacked PRs)

The feature is well over the PR ceiling (19 files / 400 lines). Each slice is
independently mergeable, compiles, passes its tests and breaks nothing if later slices
never land. Slices 3, 5 and 6 are cut in two (a/b) to stay under the file ceiling, and
slice 7 lands after slice 9 because its live view replaces the polling run page. `/speckit-tasks` will group tasks by these slices and split further by entity if
a slice still exceeds the ceiling. The order follows layer dependencies.

| # | Slice | Contents | User story |
|---|---|---|---|
| 1 | foundation | workspaces, compose, `.env.example`, API skeleton (config, logger, correlation, error filter, health), web skeleton, Vitest + Testcontainers harness, OpenAPI export + client generation | none |
| 2 | identity | users, migration, seed users, login/logout/me, session guard | none |
| 3a | mandates domain + persistence | `Mandate`, `MandatePolicy`, `MandateKey` domain + tests, migration, repositories | US1 |
| 3b | mandates handlers + HTTP | create/list/get agent, key guard, activity interceptor, `GET /v1/mandate` | US1 |
| 4 | catalog | merchants, categories, products, seed catalog + seed test, search/get product/get mandate agent endpoints, activity log writes | US1 |
| 5a | checkout transaction | simulated gateway, payments, orders, audit, locking transaction, idempotency | US1 |
| 5b | checkout HTTP + orders | `POST /v1/checkout`, orders endpoints | US1 |
| 6a | agent run domain + persistence | run aggregate, candidate evaluator, rule-based selector, log messages, migration, repository | US1 |
| 6b | agent run execution + HTTP | `StorePort` HTTP adapter, start-run, run executor, interrupted-run recovery, run endpoints | US1 |
| 8 | AI selector | Ollama adapter (fetch, JSON-schema `format`, 10 s abort), boot warm-up + `/health` AI status, fallback mapping, `AGENT_SELECTION_MODE`, stub HTTP server for tests | US1 |
| 9 | web: agents + runs | login, agent list, create-agent form, start run, live run view, order list/detail | US1 |
| 7 | decision log + live stream | log endpoint, SSE endpoint with replay, in-process publisher, live web view replacing polling | US2 |
| 10 | control | revoke mandate + revoke during run, keys create/list/revoke, activity endpoint, web screens for both | US3, US4 |
| 11 | MCP | MCP server + 4 tools, `mcp-demo` script, contract tests, SC-003 sweep | US4 |

## Spec follow-ups (raised by design)

1. **`interrupted` run outcome** (R7): resolved 2026-10-22; "Interrupted" added to FR-007.
2. **Declined payments and orders**: resolved 2026-10-22; Assumptions reworded so that a
   decline creates no order.
3. **Package manager**: yarn confirmed (R1).
4. **Search is not pre-filtered by mandate**: agents receive every match with an
   eligibility hint, so the log can explain discards (FR-019). This is consistent with the
   spec, noted for reviewers.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| Two validation libraries (class-validator for HTTP DTOs, zod for MCP tools and the AI output schema) | `@nestjs/swagger` derives OpenAPI from class-validator DTOs; the MCP SDK takes zod schemas, and zod gives both the JSON Schema for Ollama's `format` and the answer's validation | zod everywhere through `nestjs-zod` is not compatible with NestJS 12 (peer range `^10 \|\| ^11`); class-validator everywhere would mean hand-writing JSON Schema for MCP tools and the AI output |
| Built-in agent calls its own API over loopback HTTP instead of in-process | FR-010a requires the built-in agent to have no private shortcut; a network boundary makes that structural and testable | In-process calls to the store's handlers enforce the rule only by convention, which is exactly what FR-010a forbids relying on |
