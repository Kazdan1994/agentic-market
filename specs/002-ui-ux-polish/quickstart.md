# Quickstart: Validate UI/UX Polish and Rebrand

## Prerequisites

- Stack running per the root README (API + Postgres via Docker Compose, `apps/web` dev server).
- A seeded principal account.

## Automated gate (each slice)

```bash
yarn typecheck && yarn lint && yarn test && yarn build
```

Expected: all green. Slice-specific tests:

| Slice | Tests prove |
|-------|-------------|
| 1 | Contrast test passes for all token pairs (data-model.md); the lint rule flags raw palette classes |
| 2 | Each page shows a skeleton while pending, an alert with "Try again" that refetches, an empty-state link, and not-found for `NOT_FOUND` |
| 3 | Titles per [ui-contract](./contracts/ui-contract.md); back links; `next` honoured and `//evil.com` rejected; logout error alert |
| 4 | Slips render purchase lines grouped by `mandateId`; SPENT equals `mandate.spent`; till roll appears only for a running run; hero sentence clauses per R18. Form collapsed when agents exist, open when none; status names the new agent; double submit creates one agent |
| 5 | axe reports no serious or critical violations per page; run log is `aria-live` |

## Manual checks

1. **Brand**: open `specs/002-ui-ux-polish/mockups/direction-e.html` beside the running app; the Agents page matches its regions (ui-contract "Agents page").
2. **States**: in DevTools, throttle to Slow 3G and open each route. A skeleton is shown and the page is never blank. Block `/v1/orders`, click "Try again", unblock: the list loads without a page reload.
3. **Navigation**: Agents → start run → order link → "Back to Orders". Check each tab title.
4. **Return-to**: sign out, open `/orders/<id>`, sign in: you land on that order.
5. **Mobile**: set the DevTools device width to 360px and visit every route. No horizontal scrollbar.
6. **Keyboard**: sign in → create agent → start run → open order using only Tab, Enter and Space. Focus is visible throughout (SC-007).
