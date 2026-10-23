# Loop log

One entry per iteration of the completion loop (see `loop-plan.md`).

## 3a1 — mandate domain (T044–T047)

- Branch `feat/001-3a1-mandates-domain`, commit `9da4122`, 11 files, about +520 lines.
- Slice 3a split into 3a1 (domain) and 3a2 (persistence): 3a was about 22 files.
- Review: no blocking findings. Applied: dates and key hash copied on read, `exhausted`
  when remaining is at or below zero, `hash` hoisted.
- Gate in a clean worktree:

```
 Test Files  18 passed (18)
      Tests  100 passed (100)
 Test Files  1 passed (1)
      Tests  3 passed (3)
Successfully compiled: 65 files with swc (36.15ms)
✓ built in 211ms
```

## 3a2 — mandate persistence (T048–T050)

- Branch `feat/001-3a2-mandates-persistence`, commit `9ebdb63`, 10 files, +396 lines
  (excluding migration and specs).
- Review: no blocking findings. Applied: explicit row mapping, `Agent.restore`, typed
  activity enums, injected clock for activity timestamps, constraint-name assertion.
  Kept `detail: object` on the entity (TypeORM's jsonb insert typing rejects a Record).
- Gate in a clean worktree:

```
 Test Files  19 passed (19)
      Tests  104 passed (104)
 Test Files  1 passed (1)
      Tests  3 passed (3)
Successfully compiled: 73 files with swc (27.95ms)
✓ built in 210ms
```

## 3b1 — agent endpoints (T051, T053, T054; T052 partly)

- Branch `feat/001-3b1-agents-http`, commit `27e785b`, 15 files, +613 -2 (incl. tests).
- Slice 3b split into 3b1 (agents) and 3b2 (key guard, `GET /v1/mandate`).
- T052 stays open: `get-mandate.handler.ts` lands in 3b2 with the endpoint that uses it.
- Review: one real blocking finding, fixed (amounts above int32 gave a 500; now 400). Also
  `expiresAt` must include a time and offset. Two reported blockers were wrong (the
  400 and cross-user 404 tests already existed).
- **Contract change proposed, not applied**: `GET /v1/mandate` (`getOwnMandate`) declares
  only 200 and 401, but T055 needs 409 (`MandateRefusal`) for an expired, revoked or
  exhausted mandate. Suggest adding `"409": { $ref: "#/components/responses/MandateRefusal" }`.
- Gate in a clean worktree:

```
 Test Files  21 passed (21)
      Tests  118 passed (118)
 Test Files  1 passed (1)
      Tests  3 passed (3)
Successfully compiled: 81 files with swc (33.39ms)
✓ built in 277ms
```

## 3b2 — mandate key guard (T052 rest, T055, T056)

- Branch `feat/001-3b2-mandate-key-guard`, commit `d4dd0b6`, 8 files, +307 -2 (incl. tests).
- Review: no blocking findings. Applied: failure path recorded before the success path (no
  double activity row), 401 test asserts no activity row. Not done: transaction around
  the guard's activity + audit writes on refusal, timing equalisation between a malformed
  header and an unknown key (keys are high-entropy, looked up by hash).
- Still open for slice 4: `GET /v1/categories` accepts a session only; the contract also
  allows a mandate key.
- Gate in a clean worktree:

```
 Test Files  22 passed (22)
      Tests  123 passed (123)
 Test Files  1 passed (1)
      Tests  3 passed (3)
Successfully compiled: 87 files with swc (29.33ms)
✓ built in 294ms
```

## 4a — search domain (T057–T059)

- Branch `feat/001-4a-search-domain`, commit `585804e`, 6 files, +210 -0 (incl. tests).
- Slice 4 split into 4a (pure scoring and eligibility) and 4b (repository, handlers, HTTP).
- Review: no blocking findings. Applied: "-es" plural folding, "can", "will", "get" removed
  from stop words, code-point id comparison. Kept: ASCII-only tokens (catalog is English);
  eligibility reason order category → stock → budget (matches MandatePolicy).
- Gate in a clean worktree:

```
 Test Files  25 passed (25)
      Tests  134 passed (134)
 Test Files  1 passed (1)
      Tests  3 passed (3)
Successfully compiled: 90 files with swc (31.1ms)
✓ built in 228ms
```

## 4b — catalog endpoints for agents (T060–T063)

- Branch `feat/001-4b-catalog-http`, commit `81ca516`, 13 files, +517 -12 (incl. tests).
- `CatalogModule` and `MandatesModule` reference each other (`forwardRef`): mandates
  needs categories, catalog needs the key guard and mandates for eligibility hints.
- Search ranks the whole (category-filtered) catalog in memory; fine for 35 products.
- Review: no blocking findings. Applied: empty `category` rejected, 400 tests for bad
  `limit` and missing `q`. Not done: activity rows for key-authenticated
  `GET /v1/categories` (no matching activity action in the data model).
- Gate in a clean worktree:

```
 Test Files  27 passed (27)
      Tests  146 passed (146)
 Test Files  1 passed (1)
      Tests  3 passed (3)
Successfully compiled: 98 files with swc (33.43ms)
✓ built in 319ms
```

## 5a — checkout transaction (T064–T070)

- Branch `feat/001-5a-checkout-tx`, commit `f4c2193`, 13 files, +857 -0 (incl. tests, excl. migration).
- `CheckoutCommand` also carries `keyKind`, for the per-attempt log line.
- `orders.run_id` has no foreign key yet; slice 6a adds it with `agent_runs`.
- Review: no blocking findings. Applied: a replay must come from the same key, an approved
  payment without an order now throws, concurrent same-key test added.
- Kept as designed (R12): refused attempts store no payment row, so retrying the same key
  later re-evaluates; replays return the stored result even if the mandate was revoked since.
- Gate in a clean worktree:

```
 Test Files  30 passed (30)
      Tests  160 passed (160)
 Test Files  1 passed (1)
      Tests  3 passed (3)
Successfully compiled: 108 files with swc (33.6ms)
✓ built in 209ms
```

## 5b — checkout endpoint and orders (T071–T074)

- Branch `feat/001-5b-checkout-http`, commit `e0b79a8`, 13 files, +567 lines (incl. tests).
- Review: no blocking findings. Applied: test helper fails fast without
  `BUILTIN_KEY_SECRET`, `X-Agent-Run-Id` documented as a uuid. Open: a malformed
  `orderId` returns 400 while the contract lists only 200/404 for `getOrder`.
- Gate in a clean worktree:

```
 Test Files  32 passed (32)
      Tests  174 passed (174)
 Test Files  1 passed (1)
      Tests  3 passed (3)
Successfully compiled: 117 files with swc (33.84ms)
✓ built in 297ms
```

- Checkpoint S3 (budget limits), API level with `curl` against `yarn dev`. The run-based
  version (log reasons, "Budget used up" on run start) needs slice 6. Mandate cap 79.00,
  total 128.00, Audio:

```
1. Studio Max 229.00 (over cap):           HTTP 409 OVER_PER_PURCHASE_CAP
2. RunBuds Pro 79.00 (exactly the cap):    HTTP 201 order: RunBuds Pro 7900 placedBy builtin_agent
3. Podcast mic 69.00 (remaining is 49.00): HTTP 409 OVER_REMAINING_BUDGET
4. BassBox 49.00 (exactly the remaining):  HTTP 201 order: BassBox Mini 4900 placedBy builtin_agent
5. GET /v1/mandate with the key:           HTTP 409 MANDATE_EXHAUSTED
6. agent as Alice sees it:                 exhausted, spent 12800, remaining 0
```

## 6a1 — agent run domain (T075–T079)

- Branch `feat/001-6a1-run-domain`, commit `2ed2c4f`, 13 files, +579 -0 (incl. tests).
- Slice 6a split into 6a1 (domain) and 6a2 (migration, repository).
- The selector scores every kept candidate, including zero-score ones (all are eligible);
  search drops zero scores. Both use the same score and tie-break order.
- Review: no blocking findings. Applied: ineligible result without reason throws, tie
  losers get their own message, `RunLog.resume` validates `lastSeq`.
- Gate in a clean worktree:

```
 Test Files  37 passed (37)
      Tests  195 passed (195)
 Test Files  1 passed (1)
      Tests  3 passed (3)
Successfully compiled: 124 files with swc (34.67ms)
✓ built in 216ms
```

## 6a2 — run persistence (T080–T082)

- Branch `feat/001-6a2-run-persistence`, commit `3850184`, 13 files, +337 -7 (incl. tests, excl. migration).
- Migration 0007 also adds the `orders.run_id` foreign key deferred from 5a.
- Change to slice 5 code: a built-in checkout's `X-Agent-Run-Id` must name a running
  run of the same mandate, else 400 `VALIDATION_FAILED` (it was a 500 with the new FK).
  Replays are unaffected: the idempotency lookup comes first.
- Review: no blocking findings. Noted: gap-free `seq` is guaranteed by callers using
  `lastSeq + 1`, not by the database.
- Gate in a clean worktree:

```
 Test Files  38 passed (38)
      Tests  200 passed (200)
 Test Files  1 passed (1)
      Tests  3 passed (3)
Successfully compiled: 129 files with swc (35.47ms)
✓ built in 206ms
```

## 6b1 — store port and HTTP adapter (T083–T085)

- Branch `feat/001-6b1-store-adapter`, commit `44754db`, 5 files, +418 -0 (incl. tests).
- Slice 6b split into 6b1 (store adapter), 6b2 (start handler, executor, recovery) and
  6b3 (run endpoints, module).
- Review: two blocking findings, both fixed. Store calls had no timeout (a stalled API
  would hold the run, and the mandate's one-run slot, for minutes): now 10 s,
  `STORE_UNAVAILABLE`. A 2xx answer without JSON became a raw TypeError: now
  `STORE_BAD_RESPONSE`. Also: product ids must be UUIDs, the in-memory store honours
  the run's idempotency key.
- Gate in a clean worktree:

```
 Test Files  39 passed (39)
      Tests  209 passed (209)
 Test Files  1 passed (1)
      Tests  3 passed (3)
Successfully compiled: 132 files with swc (35.74ms)
✓ built in 207ms
```

## 6b2 — start handler, executor, recovery (T086–T090)

- Branch `feat/001-6b2-run-executor`, commit `c016eb5`, 10 files, +691 -0 (incl. tests).
- Decision: an unexpected error ends the run as `interrupted` (closest of the five spec
  outcomes); the outcome entry explains it was an error, not a restart.
- Review: two blocking findings, both fixed. The background `execute` had no `.catch`
  (unhandled rejection); a failure while writing the outcome left the run `running`,
  blocking its mandate until restart. Now the run is always completed (3 attempts), even
  if the outcome entry cannot be written. Also: recovery isolates each run; a checkout that
  times out is retried once with the same idempotency key, so a paid order is found.
- Gate in a clean worktree:

```
 Test Files  42 passed (42)
      Tests  232 passed (232)
 Test Files  1 passed (1)
      Tests  3 passed (3)
Successfully compiled: 137 files with swc (40.14ms)
✓ built in 325ms
```

## 6b3 — run endpoints and wiring (T091–T092)

- Branch `feat/001-6b3-run-endpoints`, commit `ed6f92c`, 13 files, +345 -3 (incl. tests).
- Seed change: RunBuds Pro is named "RunBuds Pro Running Earbuds" and described as running
  headphones. Before, the demo request matched a cheaper, weaker product or the declined
  one. Existing local databases keep the old rows (the seed never updates).
- Review: no blocking findings. Noted: `agent/domain` imports catalog's pure scoring and
  eligibility types (no runtime dependency on the catalog module).
- Gate in a clean worktree:

```
 Test Files  43 passed (43)
      Tests  237 passed (237)
 Test Files  1 passed (1)
      Tests  3 passed (3)
Successfully compiled: 143 files with swc (38.69ms)
✓ built in 320ms
```

- Checkpoint 2: full rule-based run through the API (`curl` against `yarn dev`, local
  database seeded before the rename). Mandate 100.00 / 150.00, Audio, request
  "wireless headphones for running":

```
POST /runs -> HTTP 202, status running
run completed: outcome=order_placed strategy=rules fallback=null
start to outcome: 318 ms
order: Kids Headphones from SoundHub, 29 EUR, placedBy builtin_agent
mandate: active, spent 2900, remaining 12100
decision log: 17 entries: search, 12 evaluations (cap, category, stock, cheaper offer
elsewhere), selection, mandate_check, payment, outcome
```

## 8a — selection strategy, warm-up and AI status (T096–T099)

- Branch `feat/001-8-ai-selection`, commit `928adc7`, 15 files, +367 -20 (incl. tests).
- `SelectionService` (bound to `PRODUCT_SELECTOR`) picks AI or rules and records
  `forced_rules`, `not_configured` or the AI failure; the selection log entry states it.
  With no kept candidate it skips the AI (strategy rules, no fallback reason).
- `AI_STATUS` moved from `SharedModule` to a global `AiModule` (agent/infrastructure/ai);
  `DisabledAiStatus` removed. `/health` waits at most 2 s on Ollama.
- Review: done inline (fork cannot spawn reviewers). No blockers found.
- Gate in a clean worktree: 45 files / 262 tests API, 3 web, build OK.
- Live: `yarn dev` with gemma4:e2b → `/health` = `{"status":"ok","db":"up","ai":"warm"}`.
- **Blocked:** T093–T095 (Ollama selector) need `zod` 4, which the plan lists but
  `apps/api/package.json` does not declare (only hoisted). Waiting for approval to add it.
  Until then runs log `not_configured` even with Ollama set.

## 8b — Ollama AI selector (T093–T095)

- Branch `feat/001-8-ai-selection`, commit `660aac2`, 8 files, +340 -3 (incl. tests), plus zod 4.6.5
  in `apps/api/package.json` and `yarn.lock` (approved by the user; 4.6.5 picked over 4.6.7
  because it is more than two weeks old).
- Gate in a clean worktree: api 47 files / 278 tests passed, web 3 passed, build OK.
- Self-review, no blockers. Non-blocking: a candidate the model leaves out gets the
  rule-based verdict as written in R5, so it can read "kept" next to the AI's different choice.
- Checkpoint 3 (`yarn dev`, gemma4:e2b warm, mandate 100.00 / 150.00, Audio, "wireless
  headphones for running"): HTTP 202, `order_placed`, `strategy: ai`, no fallback, 4.4 s from
  start to completion. Order: RunBuds Pro from TechCorner, 79.00 EUR (the rules picked Kids
  Headphones on the same data).
- Not done: recording a fallback reason when no product is eligible. It needs a new
  `fallback_reason` value, so the OpenAPI enum and a migration on `run_fallback_reason` change.
  Waiting for approval of the contract change.

## 8c — no-eligible reason and AI-skipped products

- Branch `feat/001-8-ai-selection`, commit `697a3c1`, 16 files, +70 -17 (incl. tests).
- Approved contract change: `fallbackReason` gains `no_eligible_candidates` (openapi.yaml,
  entity, DTO, migration `0008` adding the Postgres enum value). Recorded when nothing is
  eligible; the selection log reads "No product fits the request within the mandate, so the
  local AI was not asked."
- Approved R5 departure: a product the AI left out is shown as discarded when the AI chose
  another product. When the AI chose nothing, the rules' verdict still stands in.
- Earlier decisions kept at their defaults: the contract gaps stay as logged, the
  out-of-spec changes stay, the local database is not reset, commit-size overruns stay logged.
- Gate in a clean worktree: 47 files / 280 tests (api), 1 / 3 (web), build OK.

## 9a — web types and money helpers (T100–T101)

- Branch `feat/001-9a-web-foundation` (stacked on `feat/001-8-ai-selection`), commit `bac39d1`.
  Regenerated `schema.d.ts` (generated, outside the PR budget) plus `money.ts` and its test.
- Gate in a clean worktree: 47 / 280 (api), 2 / 14 (web), build OK.
- Stopped before T102: the tasks call for shadcn/ui `Form`, `Input`, `Select`, `Card` and
  `Badge`, which need new dependencies (Radix packages, react-hook-form) and a new
  `src/components/ui` folder. Waiting for approval; Slice 7 waits on Slice 9.

## 9b–9f and 7a: web for agents, runs and orders; run log read (T102–T111)

- Branches, stacked on `feat/001-9a-web-foundation`:
  - `feat/001-9b-ui-kit` `a4e70b3`: react-hook-form 7.89.0, zod 4.6.5, Radix slot/label/select/checkbox,
    and hand-written shadcn/ui primitives in `apps/web/src/components/ui/`. No cva or lucide.
  - `feat/001-9c-agents-page` `50b6612`: agents list (T103). Test setup now registers
    Testing Library cleanup (Vitest runs without globals) and stubs ResizeObserver.
  - `feat/001-9d-create-agent` `c22049a`: create-agent form (T102, T104). Categories are
    checkboxes, since Radix Select is single-choice; `select.tsx` is unused for now.
  - `feat/001-9e-runs` `a63466a`: start a run, run page polling every second (T105–T107).
  - `feat/001-9f-orders` `8cc14cd`: orders list and detail (T108–T109).
  - `feat/001-7a-run-log` `fa182fd`: `GET /v1/runs/{id}/log` (T110–T111). Evaluation data keys
    switched to camelCase to match contracts/run-events.md; data-model.md updated.
- Gate in a clean worktree at `fa182fd`:

```
 Test Files  48 passed (48)
      Tests  283 passed (283)
 Test Files  8 passed (8)
      Tests  33 passed (33)
Successfully compiled: 153 files with swc (49.84ms)
✓ built in 259ms
```

- Checkpoint (HTTP through the Vite proxy on :5173, `yarn dev`): login 204, /agents and
  /orders pages 200, create agent, start run, poll to completed: order_placed, strategy rules,
  fallback timeout (the model was cold), Kids Headphones / SoundHub / 29.00 EUR, run linked.
- Open: `notEvaluatedByAi` is not written into evaluation log data yet (needed by T117).
  No nav links between /agents and /orders (not in tasks).

## 7b–7d — live decision log (T112–T119)

- `feat/001-7b-run-publisher` `ed4eff3`: 6 files, +136 −3. Executor publishes each entry on
  the CQRS bus after its insert, and the completed run after storing it; `RunLogPublisher`
  filters per run.
- `feat/001-7c-run-events` `7cd72ef`: 4 files, +294 −1. `GET /v1/runs/{id}/events` (raw
  Express SSE: subscribe first, then replay `seq > Last-Event-ID`, then live, deduped by seq;
  `: ping` every 15 s; 404 as JSON before the stream opens). Ping is covered by a unit test with
  fake timers, not by the contract test.
- `feat/001-7d-web-log` `f3b0f44`: 11 files, +355 −42. `useRunEvents` + `DecisionLog`; the
  run page uses the stream instead of polling; order page link renamed "Decision log".
  "rule-based verdict" reads `notEvaluatedByAi` from the selection entry's `data.evaluations`,
  which the API already wrote, so no API change was needed.
- Gate in a clean worktree after `f3b0f44`:

```
 Test Files  51 passed (51)
      Tests  290 passed (290)
 Test Files  10 passed (10)
      Tests  42 passed (42)
Successfully compiled: 156 files with swc (56.78ms)
✓ built in 297ms
```

- Flake: the first gate after `7cd72ef` failed `AgentsPage.test.tsx` (`findByRole` 1 s default
  timeout while API integration tests ran in parallel). Passed 3/3 alone and on the re-run.
  Not fixed (outside slice 7).
- Checkpoint (API from the running `yarn dev`, Vite on :5199 as proxy): run streamed live,
  17 `log` events in order, lag from row write to client 0–40 ms, then `run.completed`
  and the server closed the stream. Reconnect with `Last-Event-ID: 5` started at 6. Bob: 404 JSON.
  AI not exercised: Ollama took 30–48 s for a 1-token warm-up, so both runs fell back to rules
  (`timeout`) and bought Kids Headphones.
