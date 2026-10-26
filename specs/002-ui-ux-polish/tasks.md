---

description: "Task list for UI/UX polish and rebrand (direction E, Slips) of the principal web app"
---

# Tasks: UI/UX Polish and Rebrand of the Principal Web App — Direction E "Slips"

**Input**: Design documents from `specs/002-ui-ux-polish/`

**Prerequisites**: plan.md, spec.md, research.md (R1–R18), data-model.md (E tokens), contracts/ui-contract.md, quickstart.md, mockups/direction-e.html (visual reference)

**Tests**: Required. Constitution Principle II is test-first, so each behaviour's failing test comes before its implementation. Tests use Vitest + Testing Library with the helpers in `apps/web/src/test-utils.tsx` (`stubApi`, `renderAt`, `makeAgent`, `makeRun`, `makeOrder`, `makeLogEntry`).

**Defaults in force** (plan "Decisions taken"): a shared `QueryState`; new folder `apps/web/public/`; live run discovery through `GET /v1/mandates/{id}/runs`. **T002 and T049 are blocked until you approve the new dependencies.**

**Paths**: source paths are under `apps/web/`. Gate per slice: `yarn typecheck && yarn lint && yarn test && yarn build`.

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup — Brand decision (Slice 0)

- [X] T001 Build brand mockups (rounds 1–3) in `specs/002-ui-ux-polish/mockups/direction-{a,b,c,d,e}.html`; direction E chosen and recorded in `specs/002-ui-ux-polish/data-model.md`
- [X] T002 **GATE (approval)**: add `@fontsource-variable/familjen-grotesk@5.3.0` and `@fontsource/space-mono@5.3.0` to `apps/web/package.json` dependencies; install; stage the lockfile in this task only

---

## Phase 2: Foundational — Brand foundation E (Slice 1, PR 1)

**Purpose**: E tokens, fonts, logo, slip edge, restyled primitives, `QueryState`. **Blocks all user stories.**

- [X] T003 [P] Write a failing contrast test in `apps/web/src/lib/contrast.test.ts`. Assert ≥ 4.5:1 for `fg`, `muted`, `faint` and `accent` on `paper` (#fcfcfa) and on `ground` (#eef0f3); for `#123a9e` on `accent-pale` (#e3eafc) and `#0f3f20` on `success-pale` (#e0f2e6); for white on `fg` (#14161a). Assert ≥ 3:1 for `accent` as the focus ring on `ground`
- [X] T004 Implement `contrastRatio(hexA, hexB)` (WCAG relative luminance) and export the token-pair table in `apps/web/src/lib/contrast.ts` so T003 passes
- [X] T005 Define the E tokens in `apps/web/src/index.css` under `@theme`. Colours: `--color-ground:#eef0f3`, `--color-paper:#fcfcfa`, `--color-fg:#14161a`, `--color-muted:#5b616b`, `--color-faint:#686e78`, `--color-rule:#e2e4e8`, `--color-dots:#c9ccd2`, `--color-accent:#1e4fd8`, `--color-accent-pale:#e3eafc`, `--color-success:#1d6b3a`, `--color-success-pale:#e0f2e6`, `--color-danger:#b42318`. Fonts: `--font-sans:"Familjen Grotesk Variable"` and `--font-print:"Space Mono"`. Import both fontsource packages. Set `body` to `bg-ground text-fg font-sans text-[15px]` (allowed exception: the body size is a token here, so define `--text-base:15px`). Add a global `:focus-visible` outline of 2px `accent` with 3px offset. Neutralise `animate-*` under `prefers-reduced-motion`
- [X] T006 [P] Add the `.slip-edge` utility in `apps/web/src/index.css` per research R17: `::before`/`::after` with a repeated inline SVG zigzag (16×8, fill `#fcfcfa`) at `top:-8px` and `bottom:-8px` (mirrored). No gradient, no mask
- [X] T007 [P] Create `apps/web/public/favicon.svg` with the receipt mark from `mockups/direction-e.html` (ink receipt, three paper lines); link it and `<meta name="theme-color" content="#eef0f3">` in `apps/web/index.html`
- [X] T008 [P] Restyle `apps/web/src/components/ui/button.tsx` to pill buttons (`rounded-full`, height 42px default and 36px `size="sm"`). `default` is `bg-fg text-white hover:bg-[#2a2e36] active:scale-[.97]`; `secondary`/`ghost` is a transparent background with `border border-[#c8ccd3] hover:bg-[#e6e8ec]`. Use only the E tokens otherwise
- [X] T009 [P] Restyle `apps/web/src/components/ui/card.tsx` to paper: `bg-paper`, no border, no shadow, no radius
- [X] T010 [P] Restyle `apps/web/src/components/ui/badge.tsx` variants: `live` (accent-pale with `#123a9e`), `success` (success-pale with `#0f3f20`), `secondary` (`bg-[#f0f1f3] text-muted`), `destructive` (danger). All `rounded-full text-xs leading-[22px] px-2.5`
- [X] T011 [P] Restyle `apps/web/src/components/ui/input.tsx`, `apps/web/src/components/ui/select.tsx` and `apps/web/src/components/ui/checkbox.tsx` to `bg-paper border-[#c8ccd3] rounded-md`, focus via the global ring, invalid `border-danger`
- [X] T012 [P] Restyle `apps/web/src/components/ui/label.tsx` and `apps/web/src/components/ui/form.tsx` (`FormMessage` in `text-danger`, descriptions in `text-muted`)
- [X] T013 [P] Write a failing test in `apps/web/src/components/QueryState.test.tsx`. While pending it renders the skeleton inside `aria-busy="true"`. On error it renders `role="alert"` "<Resource> could not be loaded." and a "Try again" button that calls `refetch`. On an `ApiError` with `code === "NOT_FOUND"` it renders "This <resource> doesn't exist." and a link to `notFound.to`. When `isEmpty(data)` is true it renders `empty`. Otherwise it renders `children(data)`
- [X] T014 Implement `apps/web/src/components/QueryState.tsx` (props `query`, `resource`, `skeleton`, `empty?`, `isEmpty?`, `notFound?: {to, label}`, `children(data)`) so T013 passes
- [X] T015 Restyle the nav in `apps/web/src/routes.tsx` to the mockup. Order: receipt mark + "Agentic Market" wordmark, then "Agents" and "Orders" (current one `text-fg font-medium`, others `text-muted`), a spacer, the user's display name with initials avatar from `useMe`, then "Log out". Height 68px (56px under 640px, where the display name is hidden but "Log out" stays). Content width 1200px, padding 24px (16px on phone)
- [X] T016 Run the slice gate; fix regressions in existing tests caused by restyling

**Checkpoint**: every existing screen renders in E colours and type; tests are green.

---

## Phase 3: User Story 1 — Always know what the app is doing (P1) 🎯 MVP (Slice 2, PR 2)

**Goal**: no blank screens, retry in place, actionable empty states.

**Independent Test**: stub each endpoint as pending, failing or empty, then assert the skeleton, the alert with "Try again" refetching, and the empty-state link on each screen.

- [X] T017 [P] [US1] Failing tests in `apps/web/src/features/agents/AgentsPage.test.tsx`: skeleton while `/v1/agents` is pending; an error shows an alert and "Try again" re-requests `/v1/agents`, then the list renders; a categories error is retryable
- [X] T018 [P] [US1] Failing tests in `apps/web/src/features/orders/OrdersPage.test.tsx`: skeleton while pending; error + retry; empty state "Orders appear once an agent buys something." with link "Go to Agents" → `/agents`
- [X] T019 [P] [US1] Failing tests in `apps/web/src/features/orders/OrderDetailPage.test.tsx`: skeleton while pending; `NOT_FOUND` → "This order doesn't exist." + link to `/orders`; other errors → alert + retry
- [X] T020 [P] [US1] Failing tests in `apps/web/src/features/runs/RunPage.test.tsx`: skeleton while pending; `NOT_FOUND` → "This run doesn't exist." + link to `/agents`; other error → alert + retry; the nested order error is retryable
- [X] T021 [P] [US1] Failing test in `apps/web/src/routes.test.tsx`: while `/v1/me` is pending, `role="status"` "Loading…" shows instead of an empty page
- [X] T022 [US1] Wrap the agents and categories queries in `QueryState` with paper-slip skeletons (`animate-pulse` blocks inside `.slip-edge` paper) in `apps/web/src/features/agents/AgentsPage.tsx`
- [X] T023 [P] [US1] Wrap the orders query in `QueryState` with a row skeleton and the empty state in `apps/web/src/features/orders/OrdersPage.tsx`
- [X] T024 [P] [US1] Wrap the order query with `notFound={{to:"/orders",label:"Back to Orders"}}` in `apps/web/src/features/orders/OrderDetailPage.tsx`
- [X] T025 [P] [US1] Wrap the run query and its nested order with `notFound={{to:"/agents",label:"Back to Agents"}}` in `apps/web/src/features/runs/RunPage.tsx`
- [X] T026 [US1] Replace `if (me.isPending) return null` with a centred `role="status"` "Loading…" and make the session error retryable in `apps/web/src/routes.tsx`
- [X] T027 [US1] Run the slice gate

---

## Phase 4: User Story 2 — Move around without getting lost (P2) (Slice 3, PR 3)

**Independent Test**: navigate agents → run → order → orders with on-page links only; `document.title` matches the contract on each route.

- [X] T028 [P] [US2] Failing tests in `apps/web/src/routes.test.tsx`: `document.title` per the contract table; "Orders" has `aria-current="page"` on `/orders/:id` and "Agents" on `/runs/:id`; the wordmark links to `/agents`; logout returning 500 shows the alert "Could not log out. Try again." and keeps the user signed in
- [X] T029 [P] [US2] Failing tests in `apps/web/src/features/auth/LoginPage.test.tsx`: an unauthenticated visit to `/orders/o1` redirects to `/login?next=%2Forders%2Fo1` and signing in lands on `/orders/o1`; `next=//evil.com` and `next=https://evil.com` fall back to `/agents`
- [X] T030 [P] [US2] Failing tests: "Back to Orders" in `apps/web/src/features/orders/OrderDetailPage.test.tsx`; "Back to Agents" in `apps/web/src/features/runs/RunPage.test.tsx`
- [X] T031 [US2] In `apps/web/src/routes.tsx`: mark "Agents" active on `/runs/*` (`useLocation`) with `aria-current`; catch a logout failure and render the alert; redirect from `ProtectedLayout` with `?next=<pathname+search>`
- [X] T032 [US2] Add `safeNext(raw: string | null): string` (accept only values starting with `/` and not `//`, else `/agents`) and use it after sign-in in `apps/web/src/features/auth/LoginPage.tsx`; restyle sign-in as one paper slip (`.slip-edge`) centred on the ground, with the receipt mark above "Sign in"
- [X] T033 [P] [US2] Add a native React 19 `<title>` per contract in `AgentsPage.tsx`, `OrdersPage.tsx`, `OrderDetailPage.tsx`, `RunPage.tsx` and `LoginPage.tsx` under `apps/web/src/features/`
- [X] T034 [P] [US2] Add the "Back to Orders" link above the heading in `apps/web/src/features/orders/OrderDetailPage.tsx`
- [X] T035 [P] [US2] Add the "Back to Agents" link above the heading in `apps/web/src/features/runs/RunPage.tsx`; render the run's DecisionLog as a till roll (see T042) when the run is running — back link done; the till roll on the run page moves to US3 with TillRoll (T042)
- [X] T036 [US2] Run the slice gate

---

## Phase 5: User Story 3 — Agents page as slips, create with clear feedback (P2) (Slice 4, PR 4)

**Goal**: the Agents page matches `mockups/direction-e.html` and the contract's "Agents page" table; agent creation is on demand with a confirmation. This slice carries US5's signature element. It is close to the PR ceiling (~380 lines); if `git diff --stat` passes 400, split T046–T047 (form) into their own PR.

**Independent Test**: with stubbed agents, orders and runs, the hero shows the left-to-spend total and the R18 sentence; each active mandate renders a slip with its grouped purchase lines; the till roll shows only for a running run; creating an agent shows a confirmation and sends one POST.

- [ ] T037 [P] [US3] Failing tests in `apps/web/src/features/agents/heroSentence.test.ts` for `heroSentence(agents, runningByMandate, now)` (R18):
  - no running run and nothing ending soon → "€X left to spend across N mandates."
  - one running → appends "<name> is shopping now"
  - one ending within 7 days (ceil of days) → appends "<name> ends in D days"
  - both → both clauses, the running one first
  - N counts only `mandate.status === "active"`
- [ ] T038 [P] [US3] Failing tests in `apps/web/src/features/agents/useAgentActivity.test.tsx`. Orders from `/v1/orders` are grouped by `mandateId`, oldest first. `GET /v1/mandates/{id}/runs` is called once per **active** mandate only (assert via the `stubApi` call log). `runningByMandate` maps a mandate to its run with `status === "running"`, and a mandate without one is absent
- [ ] T039 [P] [US3] Failing tests in `apps/web/src/features/agents/MandateSlip.test.tsx`:
  - heading = agent name; "MANDATE Nº" + last 4 characters of the mandate id
  - "Left" = `mandate.remaining`
  - meter `role="img"` named "<spent> of <budget> spent, cap <cap> per purchase"
  - purchase lines capped at 5 plus "+N more"; with no purchases, "No purchase yet … €0.00"
  - SPENT line equals `mandate.spent`, and the test also asserts it equals the sum of the order totals
  - tag "Shopping now" when running, else "Active"
  - primary action "Watch run" linking to `/runs/:id` when running, else the existing StartRunForm
- [ ] T040 [P] [US3] Failing tests in `apps/web/src/features/runs/TillRoll.test.tsx`: a header "<AGENT NAME> · LIVE" and the start time; one line per log entry (`logTime`), in uppercase text; the last entry gets the `now` class; the list has `aria-live="polite"`; nothing renders when `entries` is empty
- [ ] T041 [P] [US3] Failing tests in `apps/web/src/features/agents/AgentsPage.test.tsx`:
  - hero `h1` "Agents", the total figure, the sentence, a "New agent" button with `aria-expanded="false"`
  - slips ordered running first, then soonest `expiresAt`
  - ended mandates (exhausted/expired/revoked) as stubs, not slips
  - "Latest orders" shows 5 rows and "All N orders"
  - the till roll is present only when a run is running
  - with 0 agents the creation form is open and there are no slips
- [ ] T042 [US3] Implement `apps/web/src/features/runs/TillRoll.tsx` (props `agentName`, `startedAt`, `entries: LogEntry[]`) on paper with `.slip-edge`, Space Mono 12.5px/1.7, dashed `dots` rules between lines, the `now` line in `accent` with a blinking caret (disabled under reduced motion); reuse `logTime` from `DecisionLog.tsx` and its step-to-text mapping (extract that mapping to `apps/web/src/features/runs/run-labels.ts` if it is private)
- [ ] T043 [US3] Implement `apps/web/src/features/agents/useAgentActivity.ts` with `useOrders()` plus `useQueries` over the active mandates' `GET /v1/mandates/{mandateId}/runs`; return `{ ordersByMandate, runningByMandate, isPending, isError, refetch }`
- [ ] T044 [US3] Implement `apps/web/src/features/agents/heroSentence.ts` (pure, `formatMoney` for amounts) so T037 passes
- [ ] T045 [US3] Implement `apps/web/src/features/agents/MandateSlip.tsx`. Paper `.slip-edge`, padding 22px, hover `-translate-y-0.5`. Header holds the name at 18px/500, the mandate number in `font-print` `text-faint` and the tag. The "Left" row has the amount at 34px/500 in `accent`. The meter is 6px with an `accent-pale` track, the spent part in `fg` and a 2px cap tick, with a "<budget> budget · <cap> a purchase" / "ends …" line under it. Purchase lines are in `font-print` with dotted leaders. The SPENT line is bold. The actions row uses the primary pill plus a secondary "Edit"
- [ ] T046 [US3] Rebuild `apps/web/src/features/agents/AgentsPage.tsx` per the contract:
  - grid 7/5 hero: h1 at 15px muted, figure 84px/500 with tracking -0.04em, cents in `faint`; 56px under 640px
  - `TillRoll` on the right when running
  - "Active mandates" heading with "<spent> spent of <budget>", slips in a 3/2/1-column grid at 960 and 640px
  - a 4/8 lower row: ended stubs on `#f7f7f5`, and a latest-orders table on paper
  - a closing line "Payments are simulated. Every purchase stays within the mandate that allowed it."
  - `New agent` toggles the creation form panel (`aria-expanded`, `aria-controls`), open by default when there are 0 agents
- [ ] T047 [US3] In `apps/web/src/features/agents/CreateAgentForm.tsx` add an `onCreated(name)` prop, the pending label "Creating…" and `disabled={createAgent.isPending}`. In `AgentsPage.tsx`, show `role="status"` "Agent “<name>” created." above the slips and collapse the form. Add a failing test first in `apps/web/src/features/agents/CreateAgentForm.test.tsx`: two rapid submits produce exactly one `POST /v1/agents`
- [ ] T048 [US3] Run the slice gate; compare the running app with `mockups/direction-e.html` at 1440 and 390px (quickstart manual check 1)

---

## Phase 6: User Story 4 — Keyboard, screen reader, phone (P3) (Slice 5, PR 5)

**Independent Test**: axe finds no serious or critical violations on any page; nothing scrolls horizontally at 360px.

- [ ] T049 [US4] **GATE (approval)**: add the dev dependency `vitest-axe` and register its matcher in `apps/web/vitest.setup.ts`
- [ ] T050 [P] [US4] Failing test in `apps/web/src/features/orders/OrdersPage.test.tsx`: under 640px the Agent and Merchant columns are hidden (`hidden sm:table-cell`); long product names are `truncate` with a `title`
- [ ] T051 [P] [US4] Add `expect(await axe(container)).toHaveNoViolations()` (impact serious/critical) to one render test in each of `AgentsPage.test.tsx`, `OrdersPage.test.tsx`, `OrderDetailPage.test.tsx`, `RunPage.test.tsx` and `LoginPage.test.tsx` under `apps/web/src/features/`
- [ ] T052 [US4] Restyle `apps/web/src/features/orders/OrdersPage.tsx` and `apps/web/src/features/orders/OrderDetailPage.tsx` to E: a paper table with 13px muted headers, `rule` row lines and right-aligned tabular totals. The order detail is shown as a single receipt slip with dotted leaders, using `font-print` for the line items
- [ ] T053 [US4] Fix every axe finding from T051 in the files it names
- [ ] T054 [US4] Run the slice gate

---

## Phase 7: User Story 5 — Distinct brand identity (P3) (closes in PR 5)

- [ ] T055 [US5] Migrate the remaining raw palette classes to E tokens in every file still matched by `grep -rE '(neutral|red|green|emerald|amber)-[0-9]{2,3}' apps/web/src` (including `StartRunForm.tsx`, `DecisionLog.tsx` and `RunPage.tsx`); money amounts use `tabular-nums`; Space Mono stays limited to slip, till-roll and receipt lines
- [ ] T056 [US5] Add an ESLint `no-restricted-syntax` rule in the root `eslint.config.js` that rejects JSX `className` literals matching `/(neutral|red|green|emerald|amber|slate|gray|violet|indigo)-\d{2,3}/` for `apps/web/src/**`. This is tracked shared config, so ask before editing
- [ ] T057 [US5] Run the slice gate; the grep from T055 returns nothing

---

## Phase 8: Polish & Cross-Cutting

- [ ] T058 [P] Run the quickstart manual checks 1–6 in `specs/002-ui-ux-polish/quickstart.md` and record the results there
- [ ] T059 [P] Add a screenshot of the rebranded Agents page to `README.md`
- [ ] T060 Log each slice in the specs log, matching the existing convention (`docs(specs): log …`)

---

## Dependencies & Execution Order

- T002 (approval) → Phase 2 → US1 → US2 → US3 → US4 (T049 approval) → US5 → Polish. One stacked PR per phase.
- Shared files force the stories into series: `routes.tsx` (Phase 2, US1, US2), `AgentsPage.tsx` (US1, US3), `RunPage.tsx` (US1, US2).
- US3 uses `QueryState` (Phase 2) and `TillRoll`, which US2's T035 also uses on the run page. If US3 lands first, T035 just imports it.
- Within a story, test tasks come before implementation tasks.

## Parallel Examples

- Phase 2: T003 and T013 first; after T005, T006–T012 together.
- US1: T017–T021 together, then T023–T025 together.
- US2: T028–T030 together, then T033–T035 together.
- US3: T037–T041 together, then T042, T043 and T044 together (different files), then T045 → T046 → T047.

## Implementation Strategy

- **MVP**: Phase 2 + US1 + US3. The app wears direction E, the Agents page is the slips page, and nothing is ever blank. Ship Phase 2 → US1 → US3 first if you want the visible win earliest. US2 is independent apart from `routes.tsx` and can follow.
- Each later slice is its own PR within the 400-line ceiling; US3 is the one to watch.
