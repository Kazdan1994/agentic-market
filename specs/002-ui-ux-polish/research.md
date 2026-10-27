# Research: UI/UX Polish and Rebrand

Verified in code: `apps/web/src/index.css` holds only `@import "tailwindcss"`, so there are no theme tokens. Components use raw `neutral-*`/`red-*` classes in 16 files. Every query screen returns `null` while pending. Errors read "Please reload". `useMe` maps 401 to `null`. The API exposes a `NOT_FOUND` error code. `components.json` names lucide, but lucide is not installed.

## R1. Brand direction process

- **Decision**: Mockups in `specs/002-ui-ux-polish/mockups/`. Round 1 (pastel cards) and round 2 (A Ledger, B Framed sheet, C Editorial, D blend) were rejected as generic. Round 3 **E "Slips"** (receipt/paper concept, Stripe/Mercury polish) was chosen on 2026-10-26. The chosen tokens are recorded in data-model.md.
- **Rationale**: Mockups are cheap and reviewable in a browser, and they settle the direction before tokens exist (FR-020).
- **Alternatives**: Figma (no access in this repo); building tokens first and iterating in code (rework risk).

## R2. Token mechanism

- **Decision**: Tailwind v4 `@theme` with semantic CSS variables (`--color-surface`, `--color-fg`, `--color-muted`, `--color-accent`, `--color-danger`, `--color-success`, `--radius-*`, `--font-sans`, `--font-display`), following shadcn's `cssVariables: true` naming.
- **Rationale**: Tailwind v4 is CSS-first. `@theme` generates utilities (`bg-surface`) with no config file, and shadcn primitives already expect variables.
- **Alternatives**: A JS tokens file (duplicates CSS); keeping raw palette classes (fails FR-017).

## R3. Enforcing "no one-off values" (FR-017, SC-008)

- **Decision**: An ESLint `no-restricted-syntax` rule on JSX `className` string literals matching `(neutral|red|green|…)-\d{2,3}`, plus a review checklist item.
- **Rationale**: Uses the existing ESLint setup and needs no new dependency.
- **Alternatives**: A Tailwind plugin to strip the default palette (`--color-*: initial` inside `@theme`). Stronger, but it breaks unmigrated screens mid-stack, so it's deferred to slice 5.

## R4. Fonts

- **Decision**: `@fontsource-variable/familjen-grotesk` (interface, 400–600) and `@fontsource/space-mono` (400, 700; only text "printed" on a slip or the till roll), both 5.3.0, `font-display: swap`. **Needs approval.**
- **Rationale**: The constitution makes the runtime local-only, and offline use rules out a CDN.
- **Alternatives**: Google Fonts `<link>` (network dependency); system font stack only (weak brand).

## R5. Contrast verification (FR-018)

- **Decision**: A unit test computes WCAG relative luminance for every documented text/background token pair and asserts ≥ 4.5:1 (≥ 3:1 for large text and UI borders).
- **Rationale**: Deterministic, runs in Vitest, needs no browser.

## R6. Loading, error and empty states (US1)

- **Decision**: Skeleton blocks styled with `animate-pulse` (disabled under `prefers-reduced-motion`) that match each screen's shape. Errors render `role="alert"` with the resource name and a "Try again" button calling `query.refetch()`. `ApiError.code === "NOT_FOUND"` renders the not-found state with a link to the parent list.
- **Rationale**: TanStack Query already exposes `isPending`, `isError` and `refetch`, so no new state is needed.
- **Alternatives**: Suspense plus error boundaries (bigger refactor of every hook).

## R7. Page titles (FR-005)

- **Decision**: React 19 native `<title>` rendered inside each page component (hoisted to `<head>`), format `"<Page> · Agentic Market"`.
- **Rationale**: Built into React 19; no helmet library.

## R8. Return-to after sign-in (FR-011)

- **Decision**: `ProtectedLayout` redirects to `/login?next=<pathname+search>`. LoginPage navigates to `next` only if it starts with `/` and not `//`; otherwise it goes to `/agents`.
- **Rationale**: Covers the open-redirect risk (constitution IV / security rules).

## R9. Success feedback (FR-008)

- **Decision**: An inline `role="status"` message above the agent list ("Agent “X” created"), which clears on the next form open. No toast library.
- **Rationale**: Zero dependencies, and screen readers announce it.

## R10. Live run updates (FR-014)

- **Decision**: The DecisionLog list container gets `aria-live="polite"` and `aria-relevant="additions"`.

## R11. Orders on small screens (FR-012)

- **Decision**: Keep the `<table>` from `sm` up; below `sm`, render each order as a stacked card list (same data, `dl` rows).
- **Alternatives**: Horizontal table scroll (fails "readable without horizontal page scroll" for the main info).

## R12. Accessibility scan (SC-004)

- **Decision**: `vitest-axe` (dev dependency) runs on each page test render and asserts no serious or critical violations. **Needs approval.**
- **Alternatives**: A manual axe DevTools run recorded in quickstart (not repeatable).

## R13. Icons

- **Decision**: A few inline SVGs (back arrow, retry, logo) inside the files that use them. No lucide install.
- **Rationale**: Fewer than 5 icons don't justify a dependency (YAGNI).

## R15. Finding the running run (till roll, "Shopping now")

- **Decision**: `useAgentActivity` calls `GET /v1/mandates/{id}/runs` for each **active** mandate in parallel (TanStack `useQueries`) and takes the run with `status === "running"`. The newest running run feeds `TillRoll`, which reuses `useRunEvents` and the DecisionLog entry labels. With no running run, the roll is hidden and the hero sentence drops its "is shopping now" clause.
- **Rationale**: Uses existing endpoints (no backend change). N is small (active mandates).
- **Alternatives**: A new `GET /v1/runs?status=running` endpoint (backend change, out of scope; listed as follow-up).

## R16. Slip purchase lines

- **Decision**: Group the existing `GET /v1/orders` response by `mandateId`, newest last, and cap at 5 lines per slip plus "+N more". The SPENT total is shown from `mandate.spent` and checked against the sum of lines in a unit test.

## R17. Perforated slip edge

- **Decision**: One inline SVG zigzag (`data:` URI) as a repeated background on `::before`/`::after`, in the paper token's colour. No gradients and no masks. Decorative only (`aria-hidden` semantics via pseudo-elements).

## R18. Hero sentence

- **Decision**: Built from data only: "<left> left to spend across N mandates." plus at most two clauses in priority order: a running agent ("<name> is shopping now") and a mandate ending within 7 days ("<name> ends in D days"). Plain English and no AI-generated copy. Pure function `heroSentence(agents, runs, now)` with unit tests.

## R14. Dark mode

- **Decision**: Out of scope (spec assumption). Tokens are named semantically, so dark mode can be added later without touching components.
