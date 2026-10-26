# Feature Specification: Agent Mandate Checkout

**Feature Branch**: `001-agent-mandate-checkout`

**Created**: 2026-10-22

**Status**: Draft

**Input**: User description: "A user creates a shopping agent with a mandate (budget cap, allowed categories, expiry). The agent searches a demo catalog, picks a product, and completes a simulated checkout without human input. The user sees the order and the agent's decision log"

## Clarifications

### Session 2026-10-22

- Q: While the agent is running, should the user watch its steps appear live, or only see the result once the run has finished? → A: Live: decision log entries appear one by one during the run, then the final outcome and order.
- Q: Should the shopping agent act like an outside customer that uses the store's public interface, the same one any other agent could use, or work as a built-in feature inside the store? → A: Outside customer using only the public interface, plus a published tool interface so third-party AI agents can shop the same store in this feature.
- Q: Should the demo have a single store selling the whole catalog, or several separate merchants whose offers the agent can compare? → A: Several pre-loaded merchants (2–3); the same item may be sold by different merchants at different prices; the agent compares them; each order belongs to one merchant.
- Q: How long should the agent wait for the AI to choose before it falls back to the rule-based choice? → A: 10 seconds.
- Q: What outcome does a run get when a system restart cuts it off? → A: Interrupted (added to FR-007, raised during planning).
- Q: Does a declined payment create an order? → A: No; only approved payments create orders (Assumptions reworded, raised during planning).
- Q: Is an invalid shopping request a run outcome or a refusal before the run? → A: A refusal; no run is created (FR-006a; "Invalid request" removed from FR-007, raised during analysis).
- Q: How does a run end when the price or stock changes at checkout? → A: No eligible product, with the reason in the log (raised during analysis).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Delegate a purchase to an agent within a mandate (Priority: P1)

A signed-in user creates a shopping agent and gives it a mandate: a per-purchase cap, a total
budget, one or more allowed product categories, and an expiry date and time. The mandate can
be used for several runs until the total budget is spent or it expires. For each run the
user states what they want
in plain words (for example "a pair of wireless headphones for running"). The user starts
the agent. Without any further human input, the agent searches the demo catalog across all
merchants, compares their offers, picks one product that fits both the request and the
mandate, and completes a simulated checkout with that product's merchant. The user then
sees the resulting order: product, merchant, price, total, status and time of purchase.

**Why this priority**: this is the whole demo in one flow. Without it there is no agentic
commerce to show. Everything else explains or controls this flow.

**Independent Test**: seed the demo catalog, create a mandate (per-purchase cap 100.00 EUR,
total budget 150.00 EUR, category "Audio", expiry tomorrow), ask for "wireless headphones",
start the agent, and check that one order exists for an Audio product priced at or below
100.00 EUR, created without any user action after the start, and that the mandate's
remaining budget dropped by that price.

**Acceptance Scenarios**:

1. **Given** a user with no agents, **When** they create an agent with a per-purchase cap, a
   total budget, at least one allowed category and a future expiry, **Then** the agent and
   its mandate are saved and shown to the user as active, with the full budget remaining.
2. **Given** an active mandate and a request that matches in-stock products within budget
   and category, **When** the user starts the agent, **Then** the agent completes a
   simulated checkout for exactly one product, and the order appears in the user's order
   list with status "Paid (simulated)".
3. **Given** an active mandate whose per-purchase cap is lower than every matching product's
   price, **When** the agent runs, **Then** no order is created and the run ends with the
   outcome "No eligible product" and a stated reason.
4. **Given** a mandate with 150.00 EUR total budget that already bought a 100.00 EUR item,
   **When** a new run matches only products above 50.00 EUR, **Then** no order is created
   and the log says the remaining budget (50.00 EUR) is too low.
5. **Given** a mandate whose remaining budget is zero, **When** the user tries to start the
   agent, **Then** the run is refused with the reason "Budget used up".
6. **Given** a request that only matches products outside the allowed categories, **When**
   the agent runs, **Then** no order is created and the run outcome says no product in the
   allowed categories matched.
7. **Given** the same item sold by two merchants at 90.00 EUR and 80.00 EUR, both in stock
   and within the mandate, **When** a run uses rule-based selection, **Then** the agent buys
   the 80.00 EUR offer and the log shows both offers side by side with the reason for the
   choice.
8. **Given** a mandate whose expiry has passed, **When** the user tries to start the agent,
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
4. **Given** the user has just started a run, **When** the agent performs each step,
   **Then** the matching log entry appears on the user's screen while the run is still in
   progress, without a page reload, followed by the final outcome and, if any, the order.

---

### User Story 3 - Keep control over the agent (Priority: P3)

The user can see all their agents with their mandate, remaining budget and status (active,
exhausted, expired, revoked),
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

### User Story 4 - Let a third-party AI agent shop under a mandate (Priority: P4)

The user wants to use their own AI assistant instead of the built-in agent. From a mandate,
they create an access key and give it to the assistant. The assistant connects to the
store's published tool interface, searches the catalog and checks out, under the exact same
mandate limits as the built-in agent. The user sees the resulting orders and a log of what
the assistant did in the store.

**Why this priority**: it proves the store is open to any agent, which is the core claim of
agentic commerce. It comes last because it needs the mandate, checkout and log of Stories 1
to 3, and the demo still works without it.

**Independent Test**: create a mandate and an access key, connect a scripted third-party
client to the published tool interface with that key, search and check out one in-budget
product, then check the order is listed for the user and the attempt appears in the log;
repeat with a product over the per-purchase cap and check it is refused.

**Acceptance Scenarios**:

1. **Given** an active mandate, **When** the user creates an access key for it, **Then** the
   key is shown once, in full, and afterwards only as a masked hint.
2. **Given** a third-party agent holding a valid key, **When** it lists its available tools,
   **Then** it can discover how to search the catalog, view a product, check its mandate's
   remaining budget and check out, each with a description of its inputs and results.
3. **Given** a third-party agent holding a valid key, **When** it checks out an in-stock
   product within the mandate, **Then** an order is created for the user and the mandate's
   remaining budget drops by its price.
4. **Given** a third-party agent, **When** it tries to buy outside the mandate or uses a key
   of a revoked, expired or exhausted mandate, **Then** the request is refused with a
   machine-readable reason and the refusal is logged.

---

### Edge Cases

- The chosen product's price changes or it goes out of stock between selection and
  checkout: the checkout re-checks price, stock and mandate; if any check fails, no order is
  created, the log records why, and the run ends as No eligible product (price or stock) or
  Refused by mandate (mandate).
- The mandate expires while a run is in progress: checkout is refused after the expiry
  instant, even if the product was already selected.
- The same checkout is submitted twice (retry, double click, network replay): at most one
  order and one simulated charge exist.
- Several products tie as best match: the agent picks one by a stated tie-break (lowest
  price, then earliest listed) and logs it.
- The AI reasoning service is not configured, unavailable, silent for more than 10 seconds
  or returns an unusable answer: the run switches to rule-based selection, and the log says so and why.
- The AI picks a product that is not among the eligible candidates (unknown, over budget,
  wrong category): the pick is rejected, the rule-based selection is used instead, and the
  rejection is logged. The AI can never widen what the mandate allows.
- The per-purchase cap is higher than the remaining total budget: the remaining total
  budget is the effective limit for that run.
- The user's request is empty or has no recognizable product intent: the run is refused
  before searching, with a message asking for a clearer request.
- A cap of zero or negative, a per-purchase cap above the total budget, no category
  selected, or an expiry in the past at creation: the mandate is rejected with a
  field-level message.
- The simulated payment is declined (demo scenario): no order is marked paid, the run
  outcome is "Payment declined", and the log records it.
- A user tries to view another user's agent, order or decision log: access is denied.
- Two runs for the same mandate are started at once: only one may be in progress at a time;
  the second is refused.
- The user leaves or reloads the page during a run: the run continues; on return the user
  sees every entry logged so far and the remaining ones keep appearing live.
- A third-party agent sends a key that does not exist, was revoked, or belongs to another
  user's mandate: the request is refused without revealing whether the key or mandate
  exists.
- A built-in run and a third-party agent spend from the same mandate at nearly the same
  moment: both are checked against the same remaining budget, and their total never
  exceeds it (FR-024a).
- The live connection drops during a run: the run is unaffected, and once reconnected the
  screen shows any entries missed in between, in order and without duplicates.

## Requirements *(mandatory)*

### Functional Requirements

**Mandates and agents**

- **FR-001**: Users MUST be able to create a shopping agent with a mandate made of a
  per-purchase cap, a total budget (both in the same currency), one or more allowed
  categories from the catalog, and an expiry date and time.
- **FR-002**: System MUST reject a mandate with either cap at or below zero, a per-purchase
  cap above the total budget, no category, an unknown category, or an expiry not in the
  future, and say which field is wrong.
- **FR-003**: Each mandate MUST have a status of Active, Exhausted, Expired or Revoked.
  Exhausted is derived from a remaining budget of zero; Expired from the expiry instant;
  Revoked is set by the user and is final.
- **FR-004**: Users MUST be able to list their agents with mandate details, amount spent,
  remaining budget and status, and revoke an active mandate.
- **FR-005**: A mandate MUST be reusable across runs until it is exhausted, expired or
  revoked. Each purchase MUST be at or below the per-purchase cap, and the sum of all its
  paid orders MUST never exceed the total budget. Declined payments do not consume budget.

**Agent run**

- **FR-006**: Users MUST be able to start a run for an active mandate by giving a
  plain-language shopping request.
- **FR-006a**: A shopping request MUST be 3 to 500 characters after trimming and contain at
  least one word that is not a common filler word; otherwise no run starts and the user is
  asked for a clearer request.
- **FR-007**: Once started, a run MUST complete without any further human input, ending in
  one of these outcomes: Order placed, No eligible product, Refused by mandate, Payment
  declined, Interrupted (the run was cut off by a system restart; no checkout is left
  half-done). A checkout that fails because the price changed or the product went out of
  stock ends as No eligible product, with the reason in the log. Requests refused before
  starting (FR-006a, inactive mandate, run already in progress) create no run.
- **FR-008**: The agent MUST search the demo catalog across all merchants and consider only
  products that are in stock, in an allowed category and priced at or below the lower of
  the per-purchase cap and the remaining total budget.
- **FR-008a**: When the same item is offered by several merchants, the agent MUST compare
  those offers (price, stock) before choosing, and the decision log MUST show the
  comparison.
- **FR-009**: The agent MUST select at most one product per run. By default an AI language
  model reads the request, ranks the eligible candidates and explains its choice in plain
  language.
- **FR-009a**: When the AI is not configured, unavailable, gives no answer within 10 seconds, or
  returns an answer that is unusable or names a product outside the eligible candidates,
  the agent MUST fall back to deterministic rule-based selection (match of the request to
  product name, description and category, then the tie-break of lowest price, then
  earliest listed). The same input to the rule-based selection MUST always give the same
  product.
- **FR-009b**: The selection strategy actually used (AI or rule-based) and, for a
  fallback, its cause MUST be recorded in the run and shown to the user.
- **FR-009c**: Mandate limits MUST be enforced by the system independently of the agent's
  reasoning; no AI output can make an ineligible product purchasable.
- **FR-009d**: An operator MUST be able to force rule-based selection for the whole demo
  (for offline demos and repeatable tests).
- **FR-010**: At most one built-in agent run per mandate MUST be in progress at any time.
- **FR-010a**: The built-in agent MUST search and check out only through the store's public
  capabilities, with the same rights and limits as any third-party agent. It MUST NOT use
  any private shortcut into the catalog, mandates or checkout.

**Third-party agent access**

- **FR-010b**: The store MUST publish a tool interface, in a standard format that AI
  assistants can connect to, offering at least: search the catalog, view a product, view
  the mandate's limits and remaining budget, and check out a product.
- **FR-010c**: Users MUST be able to create an access key for one of their mandates, see it
  in full only once, and revoke it. Revoking the mandate MUST also make its keys unusable.
- **FR-010d**: A request made with an access key MUST only act on that key's mandate and
  MUST be subject to every mandate check of FR-011 and FR-024a.
- **FR-010e**: Each third-party agent action (search, product view, checkout attempt,
  refusal) MUST be recorded in that mandate's activity log with time, action and result.
  The store records what the third-party agent did; it does not claim to know why.

**Checkout and orders**

- **FR-011**: Immediately before paying, the system MUST re-check that the mandate is active
  (not exhausted, expired or revoked), the product is in stock, its current price is at or
  below both the per-purchase cap and the remaining total budget, and its category is
  allowed. Any failure MUST block the checkout.
- **FR-012**: Checkout MUST use a simulated payment only; no real money or real payment
  details are involved at any point.
- **FR-013**: A repeated submission of the same checkout MUST NOT create a second order or a
  second charge.
- **FR-014**: A successful checkout MUST create an order with exactly one merchant, showing
  product, merchant, unit price, quantity (always 1), total, currency, status, time of
  purchase, and the mandate and run (or third-party agent) it came from.
- **FR-015**: The simulated payment MUST support a declined outcome so the failure path can
  be shown in the demo.
- **FR-016**: Users MUST be able to list their orders and open each one.

**Decision log**

- **FR-017**: Every run MUST produce a decision log, including runs that end without an
  order.
- **FR-018**: Each log entry MUST record the time, step type (search, evaluation, selection,
  mandate check, payment, outcome), and a plain-language explanation.
- **FR-019**: The log MUST list every product the agent considered, with its merchant, a
  kept or discarded verdict and its reason (over budget, category not allowed, out of
  stock, weaker match, cheaper offer elsewhere).
- **FR-020**: Log entries MUST NOT be editable or deletable once written.
- **FR-021**: The decision log MUST be readable both by the user in the interface and by
  other software clients in a structured form.
- **FR-021a**: While a run is in progress, each new log entry MUST be pushed to the user's
  screen as it is written, without a page reload, and the run's final outcome (and order,
  if any) MUST appear the same way when the run ends.
- **FR-021b**: A run MUST continue whether or not anyone is watching it. A viewer who
  opens or reconnects to a run in progress MUST see all entries so far, in order, then
  receive new ones live.

**Access and safety**

- **FR-022**: Users MUST sign in to use the demo, and MUST only see and act on their own
  agents, mandates, runs, orders and logs.
- **FR-023**: Every mandate decision (allowed or refused) and every checkout attempt MUST be
  recorded in a permanent audit trail.
- **FR-024**: All amounts MUST be exact to the cent; a purchase priced at exactly the
  applicable limit is allowed, one cent over is refused.
- **FR-024a**: Two runs of the same mandate MUST NOT together spend more than its total
  budget, even if their checkouts happen at nearly the same moment.

**Demo catalog**

- **FR-025**: System MUST provide a pre-loaded demo catalog from 2 to 3 merchants. Each
  product belongs to one merchant and has a name, description, category, price, currency,
  stock level and an item reference.
- **FR-025a**: Products from different merchants that are the same item MUST share the same
  item reference, so the agent and the user can tell they are offers for the same thing.
  The demo catalog MUST include several items offered by more than one merchant at
  different prices.
- **FR-025b**: Search results, product views, orders and logs MUST show the merchant of
  every product, both in the interface and to software clients.

### Key Entities

- **User**: a person signed in to the demo who owns agents and receives orders.
- **Shopping Agent**: acts on a user's behalf to find and buy products; belongs to one user
  and holds one mandate.
- **Mandate**: the user's grant of authority to an agent: per-purchase cap, total budget,
  currency, allowed categories, expiry, status, amount spent and remaining budget.
- **Merchant**: a pre-loaded seller in the demo; owns its products and the orders placed
  with it.
- **Product**: one merchant's offer in the demo catalog, with name, description, category,
  price, currency, stock and an item reference shared by offers of the same item from
  other merchants.
- **Category**: a grouping of products used to scope what a mandate allows.
- **Agent Run**: one execution of an agent for one shopping request; has a start time, end
  time, outcome, the selection strategy used (AI or rule-based) and a decision log.
- **Decision Log Entry**: one timestamped, append-only step of a run, with a step type, an
  explanation and, when relevant, the product it concerns.
- **Order**: the result of a successful checkout: product, price, total, currency, status,
  purchase time, linked to its mandate and to the built-in run or third-party agent that
  placed it.
- **Mandate Access Key**: a secret the user hands to a third-party agent so it can act under
  one mandate; has a masked hint, creation time and status (active or revoked).
- **Mandate Activity Entry**: one timestamped, append-only record of a third-party agent's
  action under a mandate, with the action and its result.
- **Simulated Payment**: the record of one payment attempt for a checkout, with amount,
  outcome (approved or declined) and a reference that prevents duplicates.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A first-time user can create an agent with a mandate and see a completed
  order in under 2 minutes, including the time to fill in the form.
- **SC-002**: Once started, a run reaches its final outcome in under 30 seconds on the demo
  catalog.
- **SC-002a**: Each decision log entry appears on the watching user's screen within 1 second
  of the step it describes.
- **SC-003**: Across a scripted set of at least 20 runs mixing in-budget, over-budget,
  wrong-category, budget-exhausted, expired, revoked and declined cases, 100% of orders
  respect their mandate and 0 orders are created where the mandate forbids one, whichever
  selection strategy is used.
- **SC-003a**: With rule-based selection forced, running the same scripted set twice gives
  identical choices and outcomes for every run.
- **SC-003b**: When the AI is unavailable, 100% of runs still reach a final outcome through
  the fallback, within the same time limit as SC-002.
- **SC-004**: Replaying the same checkout 10 times produces exactly 1 order and 1 charge.
- **SC-004a**: A scripted third-party agent, given only a mandate access key and the
  published tool interface, completes a purchase with no other set-up or documentation.
- **SC-005**: 100% of runs, including failed ones, have a decision log that names the
  outcome and the reason for it.
- **SC-006**: In a demo session, at least 4 out of 5 viewers who read a decision log can
  correctly say why the agent picked that product without help from the presenter.

## Assumptions

- The demo has a small set of pre-created user accounts; self-service sign-up, password
  reset and profile management are out of scope.
- One currency (EUR) is used across the catalog and all mandates.
- The demo catalog holds about 30 to 50 products across about 5 categories and 2 to 3
  merchants, loaded at setup. Managing merchants or the catalog (sign-up, adding or editing
  products, merchant dashboards) is out of scope.
- All merchants are reached through the same store and the same public interface. A
  mandate covers every merchant; restricting a mandate to chosen merchants is out of scope.
- Order total equals the product price: no shipping, taxes, discounts or quantity above 1.
- Each agent has exactly one mandate; changing limits means creating a new agent.
  Editing a mandate after creation is out of scope.
- Orders are never shipped or fulfilled. An order is created only for an approved payment
  and stays "Paid (simulated)". A declined payment creates no order; it shows as the run
  outcome and in the mandate activity. Refunds and cancellations are out of scope.
- The declined payment path is triggered by a known demo setting (for example a specific
  product or amount), not by chance.
- The demo runs on a single machine for a handful of users at once; scale targets beyond
  that are out of scope.
- The AI language model runs locally on the demo machine, set up by the operator through
  configuration, so shopping requests and catalog data never leave the machine. Without
  it, the demo still works end to end with rule-based selection. Automated tests use
  rule-based selection or a scripted stand-in for the AI, never a live AI service.
- The AI only sees the user's request and the eligible candidates' public product data;
  it never receives payment details or other users' data.
- The project constitution applies: the agent and the interface use the same public
  capabilities, money is handled exactly, and payments are simulated only.
