# Data Model: UI/UX Polish and Rebrand

No persisted data changes. The models below are client-side design and view-state models.

## Brand Direction

| Field | Description |
|-------|-------------|
| name | Short label (e.g. "Ledger", "Signal", "Atelier") |
| palette | Values for every semantic color token below |
| fonts | `display` + `sans` families (and optional `mono` for amounts) |
| logo | SVG wordmark + square mark (used as favicon) |
| status | `proposed` → `chosen` (exactly one) |

**Chosen direction**: **E — Slips** (`mockups/direction-e.html`), status `chosen`. A–D: `proposed`.

| Token | Value | Use |
|-------|-------|-----|
| `ground` | `#eef0f3` | page |
| `paper` | `#fcfcfa` | slips, till roll, tables |
| `fg` (ink) | `#14161a` | text, spent bar, primary button |
| `muted` | `#5b616b` | secondary text |
| `faint` | `#686e78` | printed meta (≥ 4.5:1 on paper) |
| `rule` | `#e2e4e8` | table rules |
| `dots` | `#c9ccd2` | dashed/dotted receipt leaders (decorative) |
| `accent` | `#1e4fd8` | money left, line being printed, focus |
| `accent-pale` | `#e3eafc` | envelope track, "Shopping now" tag |
| `success` / `success-pale` | `#1d6b3a` / `#e0f2e6` | "Active" tag |
| fonts | Familjen Grotesk / Space Mono | interface / printed text only |
| radius | buttons 999px; slips 0 (paper); tags 999px | |
| logo | receipt mark (SVG in mockup nav) | nav + favicon |

## Design Tokens (CSS variables under `@theme`)

| Group | Tokens | Rule |
|-------|--------|------|
| Color | `ground`, `paper`, `fg`, `muted`, `faint`, `rule`, `dots`, `accent`, `accent-pale`, `success`, `success-pale`, `danger`, `focus` (= `accent`) | Each text/background pair ≥ 4.5:1; borders/focus ≥ 3:1 |
| Type | `font-sans` (Familjen Grotesk), `font-print` (Space Mono, slips and till roll only); hero figure 84px (56px on phone) | Body ≥ 14px; amounts use tabular numbers |
| Space | Tailwind default 4px scale only | No arbitrary values (`p-[13px]`) |
| Radius | `radius-sm`, `radius-md`, `radius-lg` | Shared by all primitives |

## Query View State (per screen)

```text
pending ──success──► ready ──(data empty)──► empty
   │                   ▲
   └──error──► error ──retry──► pending
              └─ code NOT_FOUND ─► not-found (terminal, link to parent)
```

| State | Rendered as |
|-------|-------------|
| pending | skeleton matching content shape |
| error | `role="alert"`: "<Resource> could not be loaded." + "Try again" |
| not-found | "This <resource> doesn't exist." + link to parent list |
| empty | next-action copy + link where one exists |
| ready | content |

## Agent Form View State

`collapsed` ⇄ `open` → `submitting` → (`success` → `collapsed` + confirmation) | (`error` → `open`)
Initial: `open` when the agent list is empty, `collapsed` otherwise.
