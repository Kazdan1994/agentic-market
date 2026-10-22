# Feature Specification: Agent Mandate Checkout

**Feature Branch**: `001-agent-mandate-checkout`

**Created**: 2026-10-22

**Status**: Draft

**Input**: User description: "A user creates a shopping agent with a mandate (budget cap, allowed categories, expiry). The agent searches a demo catalog, picks a product, and completes a simulated checkout without human input. The user sees the order and the agent's decision log"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Delegate a purchase to an agent within a mandate (Priority: P1)

A signed-in user creates a shopping agent and gives it a mandate: a budget cap, one or more
allowed product categories, and an expiry date and time. The user also states what they want
in plain words (for example "a pair of wireless headphones for running"). The user starts
the agent. Without any further human input, the agent searches the demo catalog, picks one
product that fits both the request and the mandate, and completes a simulated checkout. The
user then sees the resulting order: product, price, total, status and time of purchase.

**Why this priority**: this is the whole demo in one flow. Without it there is no agentic
commerce to show. Everything else explains or controls this flow.

**Independent Test**: seed the demo catalog, create a mandate (cap 100.00 EUR, category
"Audio", expiry tomorrow), ask for "wireless headphones", start the agent, and check that one
order exists for an Audio product priced at or below 100.00 EUR, created without any user
action after the start.

**Acceptance Scenarios**:

1. **Given** a user with no agents, **When** they create an agent with a budget cap, at
   least one allowed category and a future expiry, **Then** the agent and its mandate are
   saved and shown to the user as active.
2. **Given** an active mandate and a request that matches in-stock products within budget
   and category, **When** the user starts the agent, **Then** the agent completes a
   simulated checkout for exactly one product, and the order appears in the user's order
   list with status "Paid (simulated)".
3. **Given** an active mandate whose cap is lower than every matching product's price,
   **When** the agent runs, **Then** no order is created and the run ends with the outcome
   "No eligible product" and a stated reason.
4. **Given** a request that only matches products outside the allowed categories, **When**
   the agent runs, **Then** no order is created and the run outcome says no product in the
   allowed categories matched.
5. **Given** a mandate whose expiry has passed, **When** the user tries to start the agent,
   **Then** the run is refused and the user is told the mandate has expired.

---

### User Story 2 - Understand why the agent bought what it bought (Priority: P2)

For every agent run, the user opens a decision log that tells, step by step and in plain
language, what the agent did: what it searched for, which products it considered, which
ones it discarded and why (over budget, wrong category, out of stock, poor match), which
one it chose and why, the mandate checks it passed, and the payment result.

**Why this priority**: trust is the point of the demo. A purchase the user cannot explain
is a purchase they will not delegate again. It depends on User Story 1 producing runs.

**Independent Test**: run the agent once with a request that matches several products
(some over budget, some out of category), open the run's decision log, and check that every
considered product appears with a keep/discard reason and that the chosen product's reason
is stated.

**Acceptance Scenarios**:

1. **Given** a completed run that produced an order, **When** the user opens the order,
   **Then** they can open the decision log of the run that created it.
2. **Given** a decision log, **When** the user reads it, **Then** entries appear in the
   order they happened, each with a time, a step type (search, evaluation, selection,
   mandate check, payment) and a plain-language explanation.
3. **Given** a run that ended without an order, **When** the user opens its log, **Then**
   the log explains why no purchase was made.

---

### User Story 3 - Keep control over the agent (Priority: P3)

The user can see all their agents with their mandate and status (active, expired, revoked),
and can revoke a mandate at any time. Once revoked, the agent can no longer buy anything,
including in a run that is already in progress.

**Why this priority**: delegating spend needs an off switch. It is less central to the demo
story than the purchase and the log, but it shows that the user stays in charge.

**Independent Test**: create a mandate, revoke it, try to start the agent and check the run
is refused; separately, revoke during a run before checkout and check no order is created.

**Acceptance Scenarios**:

1. **Given** an active mandate, **When** the user revokes it, **Then** its status becomes
   "Revoked" immediately and cannot be reactivated.
2. **Given** a revoked mandate, **When** the user tries to start the agent, **Then** the run
   is refused with the reason "Mandate revoked".
3. **Given** a run in progress that has not yet checked out, **When** the user revokes the
   mandate, **Then** the checkout is refused, no order is created, and the decision log
   records the refusal.

---

### Edge Cases

- The chosen product's price changes or it goes out of stock between selection and
  checkout: the checkout re-checks price, stock and mandate; if any check fails, no order is
  created and the log records why.
- The mandate expires while a run is in progress: checkout is refused after the expiry
  instant, even if the product was already selected.
- The same checkout is submitted twice (retry, double click, network replay): at most one
  order and one simulated charge exist.
- Several products tie as best match: the agent picks one by a stated tie-break (lowest
  price, then earliest listed) and logs it.
- The user's request is empty or has no recognizable product intent: the run is refused
  before searching, with a message asking for a clearer request.
- Budget cap of zero or negative, no category selected, or an expiry in the past at
  creation: the mandate is rejected with a field-level message.
- The simulated payment is declined (demo scenario): no order is marked paid, the run
  outcome is "Payment declined", and the log records it.
- A user tries to view another user's agent, order or decision log: access is denied.
- Two runs for the same mandate are started at once: only one may be in progress at a time;
  the second is refused.

## Requirements *(mandatory)*

### Functional Requirements

**Mandates and agents**

- **FR-001**: Users MUST be able to create a shopping agent with a mandate made of a budget
  cap (amount and currency), one or more allowed categories from the catalog, and an expiry
  date and time.
- **FR-002**: System MUST reject a mandate with a cap at or below zero, no category, an
  unknown category, or an expiry not in the future, and say which field is wrong.
- **FR-003**: Each mandate MUST have a status of Active, Expired or Revoked. Expired is
  derived from the expiry instant; Revoked is set by the user and is final.
- **FR-004**: Users MUST be able to list their agents with mandate details and status, and
  revoke an active mandate.
- **FR-005**: A mandate's budget cap MUST apply to [NEEDS CLARIFICATION: Is a mandate
  single-use (one purchase, then spent) or reusable (several runs until the cap is used up
  or it expires)?].

**Agent run**

- **FR-006**: Users MUST be able to start a run for an active mandate by giving a
  plain-language shopping request.
- **FR-007**: Once started, a run MUST complete without any further human input, ending in
  one of these outcomes: Order placed, No eligible product, Refused by mandate, Payment
  declined, Invalid request.
- **FR-008**: The agent MUST search the demo catalog and consider only products that are in
  stock, in an allowed category and priced at or below the remaining budget.
- **FR-009**: The agent MUST select at most one product per run, using [NEEDS
  CLARIFICATION: Should the agent reason with a language model or follow a deterministic,
  rule-based matching?], and apply the tie-break of lowest price, then earliest listed.
- **FR-010**: At most one run per mandate MUST be in progress at any time.

**Checkout and orders**

- **FR-011**: Immediately before paying, the system MUST re-check that the mandate is active,
  not expired or revoked, the product is in stock, its current price is within the remaining
  budget, and its category is allowed. Any failure MUST block the checkout.
- **FR-012**: Checkout MUST use a simulated payment only; no real money or real payment
  details are involved at any point.
- **FR-013**: A repeated submission of the same checkout MUST NOT create a second order or a
  second charge.
- **FR-014**: A successful checkout MUST create an order showing product, unit price,
  quantity (always 1), total, currency, status, time of purchase and the run and mandate
  it came from.
- **FR-015**: The simulated payment MUST support a declined outcome so the failure path can
  be shown in the demo.
- **FR-016**: Users MUST be able to list their orders and open each one.

**Decision log**

- **FR-017**: Every run MUST produce a decision log, including runs that end without an
  order.
- **FR-018**: Each log entry MUST record the time, step type (search, evaluation, selection,
  mandate check, payment, outcome), and a plain-language explanation.
- **FR-019**: The log MUST list every product the agent considered with a kept or discarded
  verdict and its reason (over budget, category not allowed, out of stock, weaker match).
- **FR-020**: Log entries MUST NOT be editable or deletable once written.
- **FR-021**: The decision log MUST be readable both by the user in the interface and by
  other software clients in a structured form.

**Access and safety**

- **FR-022**: Users MUST sign in to use the demo, and MUST only see and act on their own
  agents, mandates, runs, orders and logs.
- **FR-023**: Every mandate decision (allowed or refused) and every checkout attempt MUST be
  recorded in a permanent audit trail.
- **FR-024**: All amounts MUST be exact to the cent; a purchase priced at exactly the
  remaining budget is allowed, one cent over is refused.

**Demo catalog**

- **FR-025**: System MUST provide a pre-loaded demo catalog of products, each with a name,
  description, category, price, currency and stock level.

### Key Entities

- **User**: a person signed in to the demo who owns agents and receives orders.
- **Shopping Agent**: acts on a user's behalf to find and buy products; belongs to one user
  and holds one mandate.
- **Mandate**: the user's grant of authority to an agent: budget cap, currency, allowed
  categories, expiry, status, and amount already spent.
- **Product**: an item in the demo catalog with name, description, category, price,
  currency and stock.
- **Category**: a grouping of products used to scope what a mandate allows.
- **Agent Run**: one execution of an agent for one shopping request; has a start time, end
  time, outcome and a decision log.
- **Decision Log Entry**: one timestamped, append-only step of a run, with a step type, an
  explanation and, when relevant, the product it concerns.
- **Order**: the result of a successful checkout: product, price, total, currency, status,
  purchase time, linked to its run and mandate.
- **Simulated Payment**: the record of one payment attempt for a checkout, with amount,
  outcome (approved or declined) and a reference that prevents duplicates.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A first-time user can create an agent with a mandate and see a completed
  order in under 2 minutes, including the time to fill in the form.
- **SC-002**: Once started, a run reaches its final outcome in under 30 seconds on the demo
  catalog.
- **SC-003**: Across a scripted set of at least 20 runs mixing in-budget, over-budget,
  wrong-category, expired, revoked and declined cases, 100% of orders respect their mandate
  and 0 orders are created where the mandate forbids one.
- **SC-004**: Replaying the same checkout 10 times produces exactly 1 order and 1 charge.
- **SC-005**: 100% of runs, including failed ones, have a decision log that names the
  outcome and the reason for it.
- **SC-006**: In a demo session, at least 4 out of 5 viewers who read a decision log can
  correctly say why the agent picked that product without help from the presenter.

## Assumptions

- The demo has a small set of pre-created user accounts; self-service sign-up, password
  reset and profile management are out of scope.
- One currency (EUR) is used across the catalog and all mandates.
- The demo catalog holds about 30 to 50 products across about 5 categories, loaded at
  setup. Managing the catalog (adding, editing products, sellers) is out of scope.
- Order total equals the product price: no shipping, taxes, discounts or quantity above 1.
- Each agent has exactly one mandate; changing limits means creating a new agent.
  Editing a mandate after creation is out of scope.
- Orders are never shipped or fulfilled. Order status stops at "Paid (simulated)" or
  "Payment declined"; refunds and cancellations are out of scope.
- The declined payment path is triggered by a known demo setting (for example a specific
  product or amount), not by chance.
- The demo runs on a single machine for a handful of users at once; scale targets beyond
  that are out of scope.
- The project constitution applies: the agent and the interface use the same public
  capabilities, money is handled exactly, and payments are simulated only.
