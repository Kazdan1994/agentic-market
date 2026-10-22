# Quickstart: Agent Mandate Checkout

A validation guide that proves the feature works end to end. Endpoint shapes are in
[contracts/](./contracts/) and the data rules are in [data-model.md](./data-model.md).

## Prerequisites

- Node 26 (`.nvmrc`), yarn 1.22, Docker running
- Optional, for AI selection: Ollama running locally with the model pulled
  (`ollama pull gemma4:e2b`). Without it, every run uses rule-based selection (FR-009a).
- Keep the model in memory during a demo. A cold load takes 40–50 s on a 16 GB M3, longer
  than the 10 s AI limit, so a cold run falls back to rules. Close other apps that load
  Ollama models, and check `GET http://localhost:3000/health` shows `"ai":"warm"` before
  presenting.

## Setup

```bash
cp .env.example .env.local
# edit .env.local:
#   SEED_DEMO_PASSWORD=<choose one>      # password for the seeded demo users
#   JWT_SECRET=<random 32+ chars>
#   OLLAMA_BASE_URL=http://localhost:11434   # leave unset to disable AI
#   AI_MODEL=gemma4:e2b
#   AGENT_SELECTION_MODE=auto            # auto | rules  (rules = force rule-based, FR-009d)
#   SIMULATED_DECLINE_CENTS=13           # prices ending in ,13 € are declined (R13)

yarn install
docker compose up -d db
yarn dev            # migrate + seed (idempotent) + API on :3000 + web on :5173
```

Seeded users: `alice@demo.local` and `bob@demo.local`, both with `SEED_DEMO_PASSWORD`.

## Automated gate

```bash
yarn typecheck && yarn lint && yarn test && yarn build
```

`yarn test` runs unit, handler, adapter (Testcontainers Postgres) and contract tests. It
forces `AGENT_SELECTION_MODE=rules` or uses a scripted AI stub; it never calls a live AI
service (spec assumption).

## Scenarios

Use the web app at http://localhost:5173 unless stated. Each scenario names the
requirement it proves.

### S1. Delegate a purchase (US1, SC-001, SC-002)

1. Sign in as Alice.
2. Create an agent: "Runner", per-purchase cap 100.00, total budget 150.00, category
   Audio, expiry tomorrow.
3. Start a run: "wireless headphones for running".
4. **Expect**: one order for an Audio product priced at or below 100.00 EUR, with its
   merchant shown. The mandate shows the remaining budget reduced by that price. Less than
   30 s from start to outcome.

### S2. Live log and comparison (US2, US1 scenario 7, SC-002a)

1. With `AGENT_SELECTION_MODE=rules`, start a run for an item seeded at two merchants (the
   seed README lists the item refs).
2. **Expect**: entries appear one by one while the run is going (search, evaluation per
   product with merchant and reason, selection, mandate check, payment, outcome). The
   cheaper offer is chosen, and the losing offer is discarded with "cheaper offer
   elsewhere". Reloading mid-run shows the earlier entries, then live ones continue, with
   no duplicates.

### S3. Budget limits (US1 scenarios 3–5, FR-024)

1. Mandate with per-purchase cap 50.00: ask for a product only sold above 50.00.
   **Expect** `No eligible product` with the reason in the log.
2. After S1 (remaining 150.00 minus the price), ask for something priced above the
   remaining budget. **Expect** the log names the remaining budget as the reason.
3. Spend the budget to 0. **Expect** the mandate shows `Exhausted`, and starting a run is
   refused with "Budget used up".

### S4. Declined payment (FR-015)

1. Ask for the seeded product priced at x,13 €. **Expect** outcome `Payment declined`, no
   new order, and the remaining budget unchanged.

### S5. Revoke and expiry (US3)

1. Revoke a mandate. **Expect** status `Revoked` (final); starting a run is refused.
2. Start a run and revoke while it is in progress (or use the handler test that pauses
   before checkout). **Expect** no order, and the log records the refusal.
3. A mandate created with an expiry 1 minute ahead: wait, then start a run. **Expect**
   "mandate has expired".

### S6. AI fallback (FR-009a–d, SC-003b)

1. With `OLLAMA_BASE_URL` unset, run S1. **Expect** strategy `rules`, fallback reason
   `not_configured`, shown on the run.
2. Stop Ollama, run S1. **Expect** strategy `rules`, fallback reason `unavailable`.
3. With Ollama running, the model warm (`/health` shows `"ai":"warm"`) and
   `AGENT_SELECTION_MODE=auto`, run S1. **Expect** strategy `ai`, the AI's reason in the
   selection entry, and the outcome in under 30 s.
4. Unload the model (`ollama stop gemma4:e2b`) and run S1. **Expect** fallback reason
   `timeout` after about 10 s, then the next run uses the AI again once the model has
   loaded.

### S7. Third-party agent over MCP (US4, SC-004a)

1. In Alice's agent page, create an access key. Copy it (shown once).
2. Run the scripted client:

   ```bash
   yarn workspace api mcp:demo --url http://localhost:3000/mcp --key amk_…
   ```

   It lists the tools, searches, and checks out one in-budget product.
3. **Expect**: the order appears in Alice's orders as "third-party agent". The mandate
   activity shows search and checkout. A second call over the per-purchase cap is refused
   with `OVER_PER_PURCHASE_CAP`.
4. Revoke the key and rerun. **Expect** HTTP 401.

### S8. Idempotency and isolation (SC-004, FR-022)

1. Send the same `POST /v1/checkout` 10 times with one `Idempotency-Key`. **Expect** 1
   order and 1 payment (covered by a contract test).
2. Sign in as Bob and open Alice's order or run URL. **Expect** 404.

### S9. Mandate compliance sweep (SC-003, SC-003a)

`yarn workspace api test:sweep` runs 20+ scripted runs covering these cases twice with
rules forced:

- in budget
- over budget
- wrong category
- budget exhausted
- expired
- revoked
- declined

**Expect**: 0 orders that break their mandate, and identical choices across both passes.
