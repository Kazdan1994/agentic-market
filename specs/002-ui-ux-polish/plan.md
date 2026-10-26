# Implementation Plan: UI/UX Polish and Rebrand of the Principal Web App

**Branch**: `feat/ui-ux-improve` | **Date**: 2026-10-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/002-ui-ux-polish/spec.md`

## Summary

Rebrand the principal web app to **direction E, "Slips"** (`mockups/direction-e.html`, chosen 2026-10-26 after two rejected rounds) and fix its UX gaps, frontend only. Idea: what an agent produces is a receipt, so each active mandate is a printed slip that fills with its purchases, and a running agent prints its steps on a till roll. The polish follows Stripe/Mercury (user reference): a cool ground, generous space, precise type. The chosen direction becomes semantic design tokens in Tailwind v4 `@theme` CSS variables, and the existing shadcn/ui primitives are restyled to use them. The Agents page is rebuilt to the mockup: a hero with the large left-to-spend figure and a sentence written from the data, the live till roll, active mandates as slips, ended mandates as stubs, and the latest orders. On top of that foundation, every query-driven screen gets loading, error-with-retry, empty and not-found states. The work also adds detail-page back links, per-page titles, a branded navigation bar, a collapsible agent form with a success confirmation, return-to-page after sign-in, and an accessibility and small-screen pass. No API or schema changes.

## Technical Context

**Language/Version**: TypeScript 6 (`strict`), React 19.3

**Primary Dependencies**: (new, pending approval) `@fontsource-variable/familjen-grotesk` 5.x and `@fontsource/space-mono` 5.x. Existing: Vite 8, React Router 8, TanStack Query 5, react-hook-form + zod, Tailwind CSS 4.3 (`@tailwindcss/vite`), shadcn/ui (new-york, `cssVariables: true`) on Radix primitives

**Storage**: N/A (no data changes)

**Testing**: Vitest 5 + Testing Library + jsdom (`apps/web/src/**/*.test.tsx`)

**Target Platform**: Evergreen desktop and mobile browsers, 360px and wider

**Project Type**: Web app (frontend slice of the `apps/api` + `apps/web` monorepo)

**Performance Goals**: Loading placeholder visible within 100 ms (SC-001); brand fonts must not block first render (`font-display: swap`); Agents page makes 1 + N run requests (N = active mandates, typically ≤ 5), see research R15

**Constraints**: WCAG 2.2 AA contrast (FR-018); no horizontal page scroll at 360px (FR-012); local-only runtime (constitution); new runtime dependencies only when named here, and only with user approval

**Scale/Scope**: 6 routes, 8 UI primitives, about 16 source files with hard-coded `neutral-*`/`red-*` classes to move to tokens

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Note |
|-----------|--------|------|
| I. Hexagonal + CQRS | Pass | Frontend only; no backend layers touched. |
| II. Test-first | Pass | Each behaviour (states, retry, back links, titles, return-to, collapse/confirm, live regions) gets a failing Testing Library test first. Visual tokens are checked by a contrast unit test and a lint guard against raw palette classes. |
| III. API & agent-first contracts | Pass | Uses existing endpoints and documented error codes (`NOT_FOUND`, 401). No contract change. |
| IV. Security & money safety | Pass | The `next` return-to param is validated as a same-origin relative path (open-redirect guard). Duplicate submit is blocked on agent creation; run start already uses an idempotency key. |
| V. Observability | Pass | No new logging. |
| VI. Simplicity / YAGNI | Pass with note | 3 new dependencies (2 font packages, `vitest-axe` dev), named in research.md and pending approval. No toast, icon or chart library; the slip edge is one inline SVG. |

Re-check after Phase 1: still passing. Design adds no backend surface; the dependency note stands.

## Project Structure

### Documentation (this feature)

```text
specs/002-ui-ux-polish/
├── plan.md
├── research.md
├── data-model.md          # design tokens + UI state model
├── quickstart.md
├── contracts/
│   └── ui-contract.md     # routes, titles, states, a11y contract
├── mockups/               # slice 0: 2–3 brand directions (HTML)
└── tasks.md               # /speckit-tasks
```

### Source Code

```text
apps/web/
├── index.html                       # favicon link, theme-color
├── public/                          # NEW folder: favicon.svg (needs OK)
└── src/
    ├── index.css                    # @theme tokens, font-face, focus ring
    ├── routes.tsx                   # NavBar brand + logo, nested active state, return-to
    ├── components/ui/*.tsx          # restyle primitives to tokens (no new primitives)
    └── features/
        ├── auth/LoginPage.tsx       # branding, `next` handling
        ├── agents/AgentsPage.tsx    # hero (left-to-spend + sentence), slips, stubs, latest orders
        ├── agents/MandateSlip.tsx   # one slip: header, left, envelope meter, purchase lines, actions
        ├── agents/useAgentActivity.ts # orders grouped by mandateId + running run per active mandate
        ├── runs/TillRoll.tsx        # live run printed as a roll (reuses DecisionLog entries + useRunEvents)
        ├── agents/CreateAgentForm.tsx
        ├── orders/OrdersPage.tsx    # stacked list < sm, states
        ├── orders/OrderDetailPage.tsx
        └── runs/RunPage.tsx, DecisionLog.tsx, StartRunForm.tsx
```

**Structure Decision**: Changes stay inside the existing `apps/web` feature folders. Following the user rule against unprompted shared components, the loading, error and empty states are first written inline per page. Open question Q1 proposes one shared `QueryState` helper instead.

## Delivery Slices (stacked; brand first, per clarification)

Total estimate is about 30 files and ~900 lines, past the PR ceiling, so the work ships as stacked PRs:

| # | Slice | Holds | Est. files / lines |
|---|-------|-------|--------------------|
| 0 | Brand mockups | `specs/.../mockups/`, direction E chosen (FR-020) | docs only, done |
| 1 | Brand foundation | E tokens in `index.css`, 2 font packages, receipt logo + favicon, slip edge utility, restyle 8 primitives, contrast test | ~14 / ~260 |
| 2 | Screen states (US1) | loading/error-retry/empty/not-found on 5 screens, session pending | ~10 / ~300 |
| 3 | Navigation (US2) | nav brand, nested active, back links, titles, return-to, logout error | ~8 / ~200 |
| 4 | Agents page as slips (US3 + US5) | hero, `MandateSlip`, stubs, `useAgentActivity`, `TillRoll`, collapsible form, confirmation, duplicate guard | ~9 / ~380 |
| 5 | A11y + mobile (US4) | orders stacked layout, live regions, focus, status text, axe tests | ~8 / ~200 |

Each slice compiles, passes the gate and is shippable alone. Slices 2–5 restyle remaining raw classes on the screens they touch.

## Decisions taken (defaults; you can still change them)

1. **Shared state helper**: `QueryState` component reused on 5 screens (recommended default, not contested).
2. **New dependencies**: `@fontsource-variable/familjen-grotesk`, `@fontsource/space-mono`, `vitest-axe` (dev). **Still needs your explicit OK** before install (tasks T004, T046).
3. **New folder** `apps/web/public/` for `favicon.svg` (Vite convention).
4. **Live run discovery** uses the existing `GET /v1/mandates/{id}/runs` per active mandate; no backend change (research R15). A list-runs-by-principal endpoint is a possible follow-up if N grows.

## Complexity Tracking

No constitution violations.
