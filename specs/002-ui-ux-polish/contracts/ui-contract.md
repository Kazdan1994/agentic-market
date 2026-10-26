# UI Contract: Principal Web App

The API contract is unchanged. This page defines the user-facing contract that tests assert.

## Routes

| Route | Title | Nav current | Back link | Not-found |
|-------|-------|-------------|-----------|-----------|
| `/login` | Sign in · Agentic Market | – | – | – |
| `/agents` | Agents · Agentic Market | Agents | – | – |
| `/runs/:runId` | Run · Agentic Market | Agents | ← Agents | yes |
| `/orders` | Orders · Agentic Market | Orders | – | – |
| `/orders/:orderId` | Order · Agentic Market | Orders | ← Orders | yes |

## Query parameters

- `/login?next=<path>`: honoured only when the value starts with `/` and not `//`; otherwise ignored, with `/agents` as the fallback.

## Accessible names (test selectors)

| Element | Role / name |
|---------|-------------|
| Retry | button "Try again" |
| Back link | link "Back to Agents" / "Back to Orders" |
| Agent form toggle | button "New agent", `aria-expanded` |
| Creation confirmation | status containing the agent name |
| Loading | `aria-busy="true"` on the main region |
| Run log | list with `aria-live="polite"` |
| Logout error | alert "Could not log out. Try again." |
| Status badge | visible text label (never color alone) |

## Agents page (direction E)

| Region | Content | Accessible name |
|--------|---------|-----------------|
| Hero | h1 "Agents", left-to-spend figure, data sentence (R18), "New agent", "View orders" | — |
| Till roll | Shown only when a run is running; `aria-live="polite"` list | region "<Agent> live" |
| Active mandates | one `article` slip per active mandate, ordered: running first, then soonest end | heading = agent name |
| Slip | "Left" amount, envelope meter (`role="img"` with spent/budget/cap label), ≤ 5 purchase lines + "+N more", SPENT total, primary action "Watch run" or "Start run" | — |
| Ended | stub per exhausted/expired/revoked mandate | — |
| Latest orders | 5 newest, link "All N orders" | — |

## Breakpoints

- `< 640px`: orders as stacked cards; slips one per row; till roll below the hero; nav stays in one row with Log out kept reachable.
- `≥ 640px`: orders as table.
- No horizontal page scroll at 360px on any route.
