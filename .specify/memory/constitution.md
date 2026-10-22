# Agentic Market Constitution

## Core Principles

### I. Hexagonal Architecture with CQRS

The backend is a modular monolith organized by bounded context, each following ports and
adapters with command/query separation.

- The domain layer MUST NOT import NestJS, TypeORM, HTTP or any other framework code. Domain
  entities, value objects and domain services are plain TypeScript.
- The application layer defines ports (interfaces) and use cases as command and query
  handlers (`@nestjs/cqrs`). It depends on the domain only.
- Infrastructure adapters (TypeORM repositories, payment providers, external agents, HTTP
  controllers) implement or call ports and live outside the domain and application layers.
- TypeORM entities are persistence models, distinct from domain entities, translated by
  explicit mappers.
- Commands change state and return at most an identifier or an acknowledgement. Queries
  MUST NOT change state.
- A bounded context MUST NOT reach into another context's internals; it talks through that
  context's public commands, queries or domain events.

Rationale: business rules stay testable without a database or framework, and the read/write
split keeps the purchase flows of human and agent clients easy to reason about.

### II. Test-First Development (NON-NEGOTIABLE)

- Every production change starts with a test that fails for the right reason. Only then is
  implementation written, followed by refactoring with tests green (Red-Green-Refactor).
- Domain logic is covered by unit tests that run without NestJS or a database.
- Command and query handlers are tested against in-memory implementations of their ports.
- Persistence adapters are tested against a real Postgres instance, never a mock of TypeORM.
- Every public API endpoint (and MCP tool, when present) has a contract test asserting its
  request/response shape and error cases.
- A bug fix MUST start with a test that reproduces the bug.
- Code without a corresponding test MUST NOT be merged.

Rationale: in a commerce demo, a silent regression in pricing, cart or payment logic
destroys the demo's credibility. Writing the test first is how we keep the behaviour pinned.

### III. API & Agent-First Contracts

- Every capability is exposed through a typed, versioned HTTP API before any UI is built on
  it. The React frontend consumes that same public API; UI-only private endpoints are
  forbidden.
- API contracts are described by an OpenAPI document generated from the request/response
  DTOs. The generated spec is the source of truth for agent and frontend clients.
- Responses are machine-readable and deterministic: stable field names, explicit units,
  documented error codes. An agent MUST be able to complete a flow without parsing prose.
- Where a feature targets AI agents directly, it MAY also expose an MCP tool surface,
  implemented as an adapter over the same application commands and queries.
- Breaking contract changes require a new API version; existing versions keep working until
  explicitly retired in a spec.

Rationale: the product is agentic commerce. If an agent cannot use a feature through a
stable contract, the feature does not exist for the demo.

### IV. Security & Money Safety

- Every endpoint enforces authentication and authorization. Callers are identified as a
  human user or an agent acting on behalf of a principal. Exempt: an unauthenticated
  liveness endpoint that exposes no user or business data, and the API documentation (the
  OpenAPI document and its viewer).
- An agent-initiated purchase MUST be covered by an explicit mandate from its principal
  (spend cap, allowed merchant or category scope, expiry). Actions outside the mandate are
  rejected, never clamped silently.
- Monetary amounts are stored and computed as integer minor units with an ISO 4217 currency
  code. Floating-point money is forbidden.
- Every money-moving command requires an idempotency key; replaying it MUST NOT charge,
  refund or transfer twice.
- Transactions and mandate decisions are recorded in an append-only audit log.
- All external input (HTTP bodies, query params, agent tool calls, provider webhooks) is
  validated at the adapter boundary against a schema, failing fast with a typed error.
- No real funds move: payment providers run in sandbox or simulated mode only.
- Secrets live in environment variables loaded from untracked files (`.env.local`), never in
  source or committed config.

Rationale: agents spending on someone's behalf is the core risk of agentic commerce. Even
in a demo, the safety model is part of what is being demonstrated.

### V. Observability

- Logs are structured (JSON) with a level, a timestamp and a correlation ID.
- A correlation ID is assigned at the edge of every request and propagated through
  commands, queries, domain events and outbound calls.
- Every agent action and every transaction is logged with the agent ID, principal ID,
  mandate ID (when applicable), outcome and correlation ID.
- Errors are logged once, with full context, at the layer that handles them. Clients
  receive a typed error code, never a stack trace.
- Logs MUST NOT contain secrets, credentials, full payment details or unnecessary personal
  data.

Rationale: when an agent makes a surprising purchase decision, we need to reconstruct
exactly what it saw and did.

### VI. Simplicity & YAGNI

- Build the smallest thing that satisfies the current spec. No speculative abstractions,
  plugin systems or configuration for unrequested cases.
- Ports exist only at real boundaries: persistence, payment providers, external agents,
  clock and ID generation. Pure in-process logic needs no port.
- One deployable backend (modular monolith) and one frontend app. Microservices, message
  brokers and multi-tenancy are out of scope unless a spec justifies them.
- Pull requests target about 7 files and 120 changed lines, with a hard ceiling of 19 files
  or 400 lines (lockfiles, generated files and migrations excluded). Larger work is split
  into stacked, independently mergeable slices.
- Any deviation from these principles MUST be justified in the plan's Complexity Tracking
  table, including the simpler alternative that was rejected and why.

Rationale: it is a demo. Its value comes from a clear, working flow, not from
infrastructure.

## Technology Stack & Constraints

- **Backend**: NestJS with `@nestjs/cqrs`, organized as hexagonal bounded-context modules.
- **Language**: TypeScript with `strict: true` in every package. `any` and non-null
  assertions (`!`) require an inline justification comment. Nullability is handled with
  explicit guards and narrowing.
- **Persistence**: PostgreSQL through TypeORM. Schema changes go through versioned
  migrations; `synchronize: true` is forbidden outside throwaway test databases.
- **Frontend**: Vite + React + TypeScript, styled with Tailwind CSS and shadcn/ui
  components. The frontend talks to the backend only through the public API (Principle III).
- **Runtime**: local only. Postgres and any other server dependency run via Docker Compose;
  the whole stack starts from a documented, single command. Exception: an optional AI model
  runtime that needs direct GPU access (e.g. Ollama on macOS, where containers get no GPU)
  MAY run natively on the host, provided the stack works end to end without it and its
  setup is documented. Cloud deployment is out of scope.
- **Dependencies**: a new runtime dependency is added only when a spec or plan names the
  need it serves.

## Development Workflow & Quality Gates

- Features follow the Spec Kit flow: `/speckit-specify` → `/speckit-clarify` (when needed)
  → `/speckit-plan` → `/speckit-tasks` → `/speckit-implement`.
- Every plan includes a Constitution Check against Principles I–VI and is re-checked after
  design. Failures are fixed or recorded in Complexity Tracking before tasks are generated.
- Tasks are ordered test-first: for each behaviour, the test task precedes the
  implementation task (Principle II).
- Before every commit, the following MUST pass: typecheck, lint, the full test suite, and
  the build for each affected app.
- Commits follow Conventional Commits (`type(scope): subject`).
- Code review verifies constitution compliance and classifies findings as blocking or
  non-blocking. A violation of Principles II or IV is always blocking.

## Governance

- This constitution supersedes any other project practice or guideline. Runtime guidance for
  agents and contributors (e.g. `CLAUDE.md`, when present) MUST stay consistent with it.
- Amendments are made through `/speckit-constitution` in a dedicated change that states the
  version bump, the rationale and the impact on in-flight specs and plans.
- Versioning follows semantic versioning:
  - MAJOR: a principle is removed or redefined in a backward-incompatible way.
  - MINOR: a principle or section is added, or guidance is materially expanded.
  - PATCH: clarifications and wording fixes with no change in meaning.
- Compliance is checked at three points: the plan's Constitution Check, task generation
  (test-first ordering), and code review before merge.

**Version**: 1.1.0 | **Ratified**: 2026-10-22 | **Last Amended**: 2026-10-22
