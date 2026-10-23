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
