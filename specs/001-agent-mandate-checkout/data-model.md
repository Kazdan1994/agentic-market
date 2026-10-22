# Data Model: Agent Mandate Checkout

**Feature**: [spec.md](./spec.md) | **Research**: [research.md](./research.md)

All IDs are UUID v7. All timestamps are `timestamptz` (UTC). Money is an integer number of
minor units (cents) plus an ISO 4217 `currency` (always `EUR` in this feature). The tables
are grouped by the bounded context that owns them; no context writes another context's
tables.

## Context: identity

### User

| Field | Type | Rules |
|---|---|---|
| id | uuid | PK |
| email | text | unique, lower-cased |
| display_name | text | 1–80 chars |
| password_hash | text | argon2id; never returned or logged |
| created_at | timestamptz | |

Seeded only (no sign-up). FR-022.

## Context: catalog

### Merchant

| Field | Type | Rules |
|---|---|---|
| id | uuid | PK |
| slug | text | unique, `[a-z0-9-]+` |
| name | text | display name |

The seed has 2 to 3 merchants. FR-025.

### Category

| Field | Type | Rules |
|---|---|---|
| id | uuid | PK |
| slug | text | unique (e.g. `audio`, `sports`, `home`, `books`, `kitchen`) |
| name | text | |

### Product

| Field | Type | Rules |
|---|---|---|
| id | uuid | PK |
| merchant_id | uuid | FK → Merchant |
| category_id | uuid | FK → Category |
| item_ref | text | shared by offers of the same item across merchants (FR-025a) |
| name | text | |
| description | text | |
| price_minor | integer | `> 0` |
| currency | char(3) | `EUR` |
| stock | integer | `>= 0`, decremented only by checkout |
| listed_at | timestamptz | used by the tie-break "earliest listed" |

- Unique `(merchant_id, item_ref)`, so a merchant lists an item at most once.
- Seed constraints (checked by a seed test): 30 to 50 products across about 5 categories;
  at least 5 `item_ref`s offered by two or more merchants at different prices; at least one
  product whose `price_minor % 100 = 13` (the declined-payment trigger, R13); at least one
  product with `stock = 0`.

## Context: mandates

### Agent

| Field | Type | Rules |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK → User (owner) |
| name | text | 1–60 chars |
| created_at | timestamptz | |

One agent has exactly one mandate (spec assumption).

### Mandate

| Field | Type | Rules |
|---|---|---|
| id | uuid | PK |
| agent_id | uuid | FK → Agent, unique |
| user_id | uuid | FK → User (denormalized for authorization) |
| per_purchase_cap_minor | integer | `> 0` and `<= total_budget_minor` (FR-002) |
| total_budget_minor | integer | `> 0` |
| spent_minor | integer | starts at 0; `0 <= spent_minor <= total_budget_minor` (DB check) |
| currency | char(3) | `EUR` |
| expires_at | timestamptz | `> now()` at creation (FR-002) |
| revoked_at | timestamptz null | set once, never cleared (FR-003) |
| created_at | timestamptz | |

**Derived values** (computed in the domain, never stored):

- `remaining_minor = total_budget_minor - spent_minor`
- `effective_limit_minor = min(per_purchase_cap_minor, remaining_minor)` (FR-008)
- `status`, evaluated in this order:

```text
revoked_at != null            → Revoked     (final)
now >= expires_at             → Expired     (final)
remaining_minor == 0          → Exhausted   (final: spending only increases)
otherwise                     → Active
```

**State transitions**:

```text
           revoke                      expiry instant passes
 Active ───────────▶ Revoked     Active ───────────────────▶ Expired
   │
   │ paid order brings remaining to 0
   ▼
 Exhausted
```

Revoke is allowed only from Active (FR-004); revoking an Expired or Exhausted mandate is
refused as already inactive.

### MandateCategory

| Field | Type | Rules |
|---|---|---|
| mandate_id | uuid | PK part, FK → Mandate |
| category_id | uuid | PK part, FK → Category |

At least one row per mandate (FR-002).

### MandateKey (Mandate Access Key)

| Field | Type | Rules |
|---|---|---|
| id | uuid | PK |
| mandate_id | uuid | FK → Mandate |
| kind | enum `builtin` \| `external` | `builtin`: one per mandate, created with it, never shown (R8). `external`: created by the user (FR-010c) |
| key_hash | bytea | SHA-256 of the secret; unique |
| hint | text | last 4 characters, shown masked as `amk_…abcd` |
| label | text null | optional user label for `external` keys |
| created_at | timestamptz | |
| revoked_at | timestamptz null | |

The `builtin` key's secret is never stored. It is derived on demand as
`amk_` + base64url(HMAC-SHA256(`BUILTIN_KEY_SECRET`, mandate_id)), so the run executor can
rebuild it, and only its hash sits in `key_hash` like any other key.

A key is usable only when `revoked_at` is null and its mandate's status is Active. A
request with a non-Active mandate's key is refused with the mandate status code, so the
caller learns why (spec US4 scenario 4). An unknown or revoked key gets a generic 401.

### MandateActivityEntry

| Field | Type | Rules |
|---|---|---|
| id | uuid | PK |
| mandate_id | uuid | FK → Mandate |
| key_id | uuid | FK → MandateKey |
| at | timestamptz | |
| action | enum `search` \| `view_product` \| `view_mandate` \| `checkout` | |
| result | enum `ok` \| `refused` \| `declined` \| `error` | |
| detail | jsonb | e.g. query text, product id, refusal code, order id |
| correlation_id | uuid | |

Append-only (DB trigger, R14). Written for every key-authenticated request, built-in or
external (FR-010e). The UI shows `external` activity in the mandate view; built-in actions
are explained in run logs.

## Context: agent

### AgentRun

| Field | Type | Rules |
|---|---|---|
| id | uuid | PK |
| mandate_id | uuid | FK → Mandate |
| user_id | uuid | FK → User |
| request | text | 3–500 chars after trim; refused with `Invalid request` otherwise |
| status | enum `running` \| `completed` | |
| outcome | enum null | `order_placed` \| `no_eligible_product` \| `refused_by_mandate` \| `payment_declined` \| `invalid_request` \| `interrupted` (FR-007; `interrupted` from R7) |
| strategy | enum null `ai` \| `rules` | the strategy that actually chose (FR-009b) |
| fallback_reason | enum null | `not_configured` \| `forced_rules` \| `unavailable` \| `timeout` \| `api_error` \| `unusable_answer` \| `ineligible_choice` (research R5) |
| order_id | uuid null | set when `outcome = order_placed` |
| started_at | timestamptz | |
| ended_at | timestamptz null | set with `outcome` |
| correlation_id | uuid | |

- Partial unique index `(mandate_id) WHERE status = 'running'` enforces FR-010.
- `outcome`, `ended_at` and `status = completed` are set together, once.

**State transitions**:

```text
(start refused before insert: mandate not Active, request invalid, run in progress)
          │ no row created; API returns the refusal code
          ▼
 running ──── final outcome ───▶ completed
 running ──── server restart ──▶ completed (outcome = interrupted)
```

### RunLogEntry (Decision Log Entry)

| Field | Type | Rules |
|---|---|---|
| run_id | uuid | PK part, FK → AgentRun |
| seq | integer | PK part; 1, 2, 3… without gaps; doubles as the SSE event id |
| at | timestamptz | |
| step | enum | `search` \| `evaluation` \| `selection` \| `mandate_check` \| `payment` \| `outcome` (FR-018) |
| message | text | plain-language explanation |
| product_id | uuid null | the product concerned, if any |
| data | jsonb | structured detail for software clients (FR-021), e.g. `{verdict, reason_code, merchant, price_minor, strategy}` |

- Append-only (R14).
- `evaluation` entries carry `verdict ∈ {kept, discarded}` and
  `reason_code ∈ {over_budget, category_not_allowed, out_of_stock, weaker_match,
  cheaper_offer_elsewhere}` (FR-019).

## Context: checkout

### Payment (Simulated Payment)

| Field | Type | Rules |
|---|---|---|
| id | uuid | PK |
| mandate_id | uuid | FK → Mandate |
| key_id | uuid | FK → MandateKey (who paid) |
| idempotency_key | text | 8–100 chars from the `Idempotency-Key` header |
| request_hash | bytea | SHA-256 of `(product_id, expected_price_minor)`; detects key reuse with a different body |
| product_id | uuid | |
| amount_minor | integer | `> 0` |
| currency | char(3) | |
| outcome | enum `approved` \| `declined` | |
| reference | text | `sim_` + random, unique |
| created_at | timestamptz | |

- Unique `(mandate_id, idempotency_key)` gives at most one charge per checkout (FR-013,
  SC-004).
- A `declined` payment consumes no budget and no stock (FR-005).

### Order

| Field | Type | Rules |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | owner (from the mandate) |
| mandate_id | uuid | |
| merchant_id | uuid | exactly one merchant (FR-014) |
| product_id | uuid | |
| run_id | uuid null | set when placed by the built-in agent |
| key_id | uuid | the key used; its `kind` tells built-in from third-party |
| payment_id | uuid | unique, FK → Payment (approved only) |
| product_name | text | snapshot at purchase |
| merchant_name | text | snapshot at purchase |
| unit_price_minor | integer | snapshot |
| quantity | integer | always 1 |
| total_minor | integer | `= unit_price_minor * quantity` |
| currency | char(3) | |
| status | enum `paid_simulated` | the only status this feature creates |
| placed_at | timestamptz | |

An order exists only for an approved payment. A declined payment creates no order; it shows
as the run outcome `payment_declined` and in the mandate activity.

## Cross-cutting: AuditEvent

| Field | Type | Rules |
|---|---|---|
| id | uuid | PK |
| at | timestamptz | |
| actor_type | enum `user` \| `mandate_key` \| `system` | |
| actor_id | uuid | |
| mandate_id | uuid null | |
| type | enum | `mandate.created`, `mandate.revoked`, `key.created`, `key.revoked`, `mandate.check.allowed`, `mandate.check.refused`, `checkout.attempted`, `payment.approved`, `payment.declined`, `order.placed`, `run.interrupted` |
| payload | jsonb | amounts, codes and IDs only: no secrets, no passwords |
| correlation_id | uuid | |

Append-only (R14). Written inside the same transaction as the change it records (FR-023).

## Validation rules (summary)

| Rule | Source | Where enforced |
|---|---|---|
| caps > 0, per-purchase ≤ total, ≥ 1 known category, expiry in future | FR-002 | domain `Mandate.create` + DTO + DB checks |
| price ≤ min(per-purchase cap, remaining), category allowed, in stock, mandate Active | FR-008, FR-011 | domain `MandatePolicy.authorize(purchase)`, inside the checkout transaction |
| exact cents; equal to the limit is allowed, one cent over is refused | FR-024 | integer comparison `<=` |
| total spend ≤ budget under concurrency | FR-024a | `FOR UPDATE` lock + DB check `spent_minor <= total_budget_minor` |
| one running run per mandate | FR-010 | partial unique index |
| no duplicate charge | FR-013 | unique `(mandate_id, idempotency_key)` |
| AI choice must be eligible | FR-009c | domain `Selection.validate(choice, eligible)` before checkout; checkout re-checks anyway |
| logs immutable | FR-020, FR-023 | DB trigger |
| own data only | FR-022 | every query filtered by `user_id` (user principal) or `mandate_id` (key principal) |
