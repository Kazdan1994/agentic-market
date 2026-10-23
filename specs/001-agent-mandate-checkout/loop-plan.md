# Completion plan: 001 agent mandate checkout

**Status on 2026-10-23**: slices 1 and 2 are done (T001–T043, 43/147 tasks), committed as a
local stack ending at `feat/001-2c-web-login`. 104 tasks remain (T044–T147).

This file is the single approval for the rest of the feature. Anything listed here can be
done without asking again. Anything that is not listed stops the loop.

## Remaining slices

Each slice is one stacked branch on top of the previous one, following the order in
`tasks.md` → "Delivery slices".

| # | Branch | Tasks | New folders | New dependencies | Human needed? |
|---|---|---|---|---|---|
| 3a | `feat/001-3a-mandates-domain` | Mandates domain and persistence (7) | `apps/api/src/mandates/` | none | no |
| 3b | `feat/001-3b-mandates-http` | Handlers, HTTP, key guard (6) | none | none | no |
| 4 | `feat/001-4-catalog-search` | Catalog search for agents (7) | none | none | no |
| 5a | `feat/001-5a-checkout-tx` | Payment and transaction (7) | `apps/api/src/checkout/` | none | no |
| 5b | `feat/001-5b-checkout-http` | Checkout HTTP and orders (4) | none | none | no |
| 6a | `feat/001-6a-run-domain` | Agent run domain and persistence (8) | `apps/api/src/agent/` | none | no |
| 6b | `feat/001-6b-run-http` | Store adapter, handlers, HTTP (10) | none | none | no |
| 8 | `feat/001-8-local-ai` | Local AI selection (7) | none | `zod` 4.6.7 (api) | **yes**: the end-to-end check needs Ollama and `gemma4:e2b` installed |
| 9 | `feat/001-9-web-agents` | Web agents, runs, orders (10) | `apps/web/src/features/{agents,runs,orders}/`, `apps/web/src/components/ui/` | shadcn/ui primitives: `radix-ui` 1.8.1, `class-variance-authority` 0.7.1, `lucide-react` 1.60.0 (web) | no |
| 7 | `feat/001-7-live-log` | Decision log, SSE, live web view (10) | none | none | no |
| 10a | `feat/001-10a-revoke` | Revoke, API and web (8) | none | none | no |
| 10b | `feat/001-10b-keys` | Keys and activity, API and web (16) | none | none | no |
| 11 | `feat/001-11-mcp` | MCP tools, demo script, polish (4 + polish) | `apps/api/src/mcp/` | `@modelcontextprotocol/sdk` 1.32.1 (api) | **yes**: final quickstart run by hand |

Versions are the newest releases at least 3 days old when this plan was written. If a version
is rejected by Yarn's age gate or a peer range, the loop stops; it does not pick another one.

## Pre-approved

- The branches, folders and dependencies in the table above.
- Splitting a slice into `a`/`b` sub-slices when it crosses 19 files or 400 lines
  (excluding lockfile, migrations, generated files and seed data), cut by layer.
- Regenerating `apps/api/openapi.json` and `apps/web/src/api/schema.d.ts`.
- Ticking tasks in `tasks.md` and appending to `loop-log.md`.
- Local commits. Messages follow `type(scope): subject` and go through the humanizer.

## Not approved: the loop stops

- Any dependency, folder or entry point not in the table.
- Any change to `spec.md`, `plan.md`, `contracts/openapi.yaml`, `data-model.md` or the
  constitution. If a task needs one, the loop writes the proposed change in `loop-log.md`.
- Any edit to tracked shared config beyond adding the approved dependencies.
- `git push`, `--no-verify`, deleting files outside the current slice, touching `.env.local`.
- A gate still red after 3 fix attempts in the same slice.

## One iteration

1. Read `tasks.md` and this file, then pick the first slice with open tasks.
2. Create the branch on top of the previous slice's branch.
3. For each task, write the failing tests first and run them to see the expected failure,
   then implement.
4. Run `yarn typecheck && yarn lint && yarn test && yarn build` in a clean worktree at the
   slice's commit, with the slice's own lockfile.
5. Run one review pass (`typescript-reviewer`, compact findings). Fix the blocking findings.
6. Tick the tasks, commit locally, and append to `loop-log.md`: slice, commit, size,
   the gate output pasted as-is, and any deviation from `tasks.md`.
7. Stop after one slice. The next iteration starts fresh from step 1.

## Checkpoints for you

- After 5b: quickstart S3 (budget limits) through `curl`.
- After 6b: a full rule-based run through the API (quickstart S1, without the UI).
- After 9: S1 in the browser.
- After 11: the whole quickstart, S1–S8, by hand, plus the `mcp-demo` script.

## Done when

All 147 tasks are ticked, every slice's gate is green in its own worktree, the quickstart
passes end to end, and the stack of local branches is ready for you to review and push.
