# Feature Specification: UI/UX Polish of the Principal Web App

**Feature Branch**: `feat/ui-ux-improve`

**Created**: 2026-10-26

**Status**: Draft

**Input**: User description: "Improve the ui / ux of the product"

Scope: every screen of the principal web app (sign in, agents, run, orders, order detail, navigation). Goals: loading/empty/error states, navigation and layout clarity, agent creation feedback, accessibility, small-screen layout, and a full rebrand (palette, typography, logo, visual direction). Delivered as stacked slices, brand direction and tokens first, then the UX stories in priority order.

## Clarifications

### Session 2026-10-26

- Q: Which scope should this feature ship with? → A: All four stories plus a visual refresh (spacing, typography, colors), stacked as several PRs.
- Q: How far should the visual refresh go? → A: Full rebrand: new palette, fonts, logo and a distinct visual direction.
- Q: Where does the new brand direction come from? → A: Claude proposes 2–3 directions as mockups of the Agents page; the user picks one before implementation.
- Q: When should the rebrand land relative to the UX fixes? → A: Brand first: direction and tokens are the first slice; UX slices are built on them.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Always know what the app is doing (Priority: P1)

A principal opens any page. While data is loading they see a visible placeholder instead of a blank area. If loading fails, they see what failed and can retry in place without reloading the whole app. When a list is empty, they are told what to do next.

**Why this priority**: Today every screen renders nothing while loading and asks the user to "reload" on failure. A blank screen reads as a broken product, and this affects every screen.

**Independent Test**: Slow down or fail each data request and confirm every screen shows a loading placeholder, an error message with a retry action, and an actionable empty state.

**Acceptance Scenarios**:

1. **Given** a signed-in principal, **When** the agents, orders, run or order page is loading, **Then** a loading placeholder shaped like the expected content is shown.
2. **Given** a data request fails, **When** the error is shown, **Then** it names what could not be loaded and offers a "Try again" action that re-fetches only that data.
3. **Given** a principal with no orders, **When** they open Orders, **Then** the empty state explains that orders appear once an agent buys something and links to Agents.
4. **Given** the session check is still pending, **When** the app starts, **Then** a loading indicator is shown instead of a blank page.

---

### User Story 2 - Move around without getting lost (Priority: P2)

A principal can always tell where they are and get back. Detail pages (run, order) have a way back to their parent list, the browser tab title names the current page, and the navigation shows the product name.

**Why this priority**: Run and order pages are reached by links and have no way back except the browser button. Tab titles are identical on every page.

**Independent Test**: Navigate agents → run → order → back to orders using only on-page controls; check the tab title on each page.

**Acceptance Scenarios**:

1. **Given** a principal on an order detail page, **When** they use the back link, **Then** they land on the Orders list.
2. **Given** a principal on a run page, **When** they use the back link, **Then** they land on Agents.
3. **Given** any page, **When** it is displayed, **Then** the browser tab title reads "<Page> · Agentic Market".
4. **Given** a principal on Orders or an order detail, **When** they look at the navigation, **Then** "Orders" is marked as current.

---

### User Story 3 - Create an agent with clear feedback (Priority: P2)

On the Agents page, the agent list comes first. The creation form opens on demand, confirms success, and the new agent is visibly added to the list.

**Why this priority**: Returning principals mostly look at their agents, but the always-open form pushes the list below the fold. A successful creation currently only clears the form.

**Independent Test**: Create an agent and confirm the form is reachable from a single action, a success confirmation appears, and the new agent shows in the list.

**Acceptance Scenarios**:

1. **Given** a principal with existing agents, **When** they open Agents, **Then** the agent list is shown first and the form is collapsed behind a "New agent" action.
2. **Given** a principal with no agents, **When** they open Agents, **Then** the creation form is open by default.
3. **Given** a valid form, **When** it is submitted, **Then** the submit button shows progress, a success confirmation names the new agent, and the form closes.
4. **Given** the submission is in progress, **When** the principal clicks submit again, **Then** no second agent is created.

---

### User Story 4 - Usable with keyboard, screen reader and on a phone (Priority: P3)

Every screen works at 360px wide without horizontal page scroll, can be operated by keyboard alone with a visible focus indicator, and announces status changes to assistive technology.

**Why this priority**: Required for a credible product, but fewer principals are blocked by it today than by stories 1 to 3.

**Independent Test**: Run an automated accessibility scan on each page, tab through each flow, and view each page at 360px wide.

**Acceptance Scenarios**:

1. **Given** a 360px-wide screen, **When** the Orders page is shown, **Then** each order is readable without horizontal page scroll.
2. **Given** keyboard-only use, **When** a principal signs in, creates an agent and starts a run, **Then** every control is reachable and shows visible focus.
3. **Given** a run in progress, **When** a new decision step appears, **Then** it is announced politely to screen readers.
4. **Given** a status badge, **When** it is read, **Then** its meaning does not depend on color alone.

---

### User Story 5 - A distinct brand identity (Priority: P3)

The product gets its own identity: a logo, a new color palette, a font pairing and a defined visual direction. Every screen shares one spacing scale, type scale and palette, so the product looks deliberate rather than default.

**Why this priority**: Raises perceived quality and trust in an app that moves money, but no flow is blocked without it. Its direction and tokens are still delivered first so later stories are built once in the new style.

**Independent Test**: Compare each screen against the defined spacing, type and color scales; no screen uses values outside them.

**Acceptance Scenarios**:

1. **Given** the sign-in page and navigation, **When** displayed, **Then** the new logo and product name appear.
2. **Given** any two screens, **When** compared, **Then** headings, body text, spacing and surfaces follow the same scales.
3. **Given** the new palette, **When** text is checked against its background, **Then** contrast meets WCAG AA.
4. **Given** money amounts and statuses, **When** shown on cards or lists, **Then** they are visually prominent over secondary labels.

---

### Edge Cases

- A detail page is opened with an unknown run or order ID: show "not found" with a link back to the parent list, not a generic error.
- The session expires mid-use: redirect to sign in and return to the requested page after signing in.
- Long agent, product or merchant names: truncate cleanly without breaking the layout; the full name is still available.
- Retry fails again: the error stays, with no duplicate messages piling up.
- Logout fails on the network: tell the principal instead of silently doing nothing.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Every data-driven screen MUST show a loading placeholder while its data is pending.
- **FR-002**: Every load error MUST name what failed and offer an in-place retry.
- **FR-003**: Every empty list MUST state the next action and link to it where one exists.
- **FR-004**: Run and order detail pages MUST provide a back link to their parent list.
- **FR-005**: Each page MUST set a distinct document title.
- **FR-006**: Navigation MUST show the product name and mark the current section, including on nested detail pages.
- **FR-007**: The agents page MUST show the agent list before the creation form, with the form collapsed when at least one agent exists.
- **FR-008**: Successful agent creation MUST show a confirmation naming the agent.
- **FR-009**: Submit actions MUST show progress and block duplicate submission while pending.
- **FR-010**: Unknown run/order IDs MUST show a not-found state distinct from other errors.
- **FR-011**: After session-expiry redirect, signing in MUST return the principal to the requested page.
- **FR-012**: Every page MUST render without horizontal page scroll at 360px width; the orders list MUST adapt to a stacked layout on narrow screens.
- **FR-013**: All interactive controls MUST be keyboard-operable with a visible focus indicator.
- **FR-014**: New run decision steps and form outcomes MUST be announced to assistive technology.
- **FR-015**: Status MUST be conveyed by text, not color alone.
- **FR-016**: Logout failures MUST be reported to the principal.
- **FR-017**: All screens MUST use one shared spacing scale, type scale and color palette; no one-off values.
- **FR-018**: All text/background color pairs MUST meet WCAG AA contrast.
- **FR-019**: The product MUST have a logo, a new color palette and a font pairing, applied on every screen and as the browser tab icon.
- **FR-020**: 2–3 brand directions MUST be presented as Agents-page mockups and one approved by the product owner before any brand styling is implemented.

### Key Entities

No new data. The feature changes how existing agents, mandates, runs and orders are presented.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Zero screens show a blank area for more than 100 ms while data loads.
- **SC-002**: 100% of load errors can be recovered from without a full page reload.
- **SC-003**: A principal can go from any detail page back to its list in one action.
- **SC-004**: Automated accessibility scan reports zero serious or critical violations on every page.
- **SC-005**: Every page passes a 360px-wide check with no horizontal page scroll.
- **SC-006**: A returning principal sees their first agent without scrolling on a 768px-tall screen.
- **SC-007**: Sign in → create agent → start run → open resulting order completes with keyboard only.
- **SC-008**: 100% of screens use only values from the shared spacing, type and color scales.

## Assumptions

- Users are principals using the existing web app; the agent-facing API is unchanged.
- Existing component library is kept and restyled to the new brand; no component rewrite.
- Brand direction is chosen from mockups by the product owner; the approved direction is recorded as design tokens in the feature folder.
- Brand covers logo, palette, fonts and visual direction; dark mode is not included.
- Copy stays English.
- No backend changes are needed. The return-to-page-after-login flow is handled client-side.
- Performance budgets follow standard web expectations; no new performance targets are set.
