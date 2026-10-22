# Contract: Agent Tool Interface (MCP)

The Model Context Protocol server lives at `POST /mcp` on the API (Streamable HTTP
transport, stateless). It covers FR-010b to FR-010e and US4.

- **Auth**: `Authorization: Bearer amk_…` (an `external` or `builtin` mandate key). A
  missing, unknown or revoked key gets HTTP 401 before any MCP processing.
- **Server info**: name `agentic-market`, version `1.0.0`.
- **Same rules**: each tool dispatches the same CQRS query or command as the matching
  HTTP endpoint in [openapi.yaml](./openapi.yaml). No tool can do anything the HTTP API
  refuses.
- **Activity log**: every tool call writes one `MandateActivityEntry` (FR-010e).
- **Errors**: a refusal is returned as a tool result with `isError: true` and
  `structuredContent: { error: { code, message, details } }`, using the error codes of
  the HTTP API. Protocol-level errors are reserved for malformed calls.

## Tools

### `search_catalog`

Searches all merchants' products. Returns every match with an eligibility hint for the
caller's mandate.

| Input | Type | Rules |
|---|---|---|
| query | string | required, 1–200 chars |
| category | string | optional category slug |
| limit | integer | optional, 1–50, default 20 |

Output (`structuredContent`): `{ products: Product & { eligibility } [] }`, the same shape
as `GET /v1/catalog/search`.

### `get_product`

| Input | Type | Rules |
|---|---|---|
| productId | string (uuid) | required |

Output: `{ product: Product }` with the current price and stock.

### `get_mandate`

No input. Output: `{ mandate: Mandate }` with the status, per-purchase cap, total budget,
spent, remaining, allowed categories and expiry.

### `checkout`

Buys one unit of a product under the caller's mandate with a simulated payment.

| Input | Type | Rules |
|---|---|---|
| productId | string (uuid) | required |
| expectedPriceMinor | integer | required, the price the agent saw, in cents |
| idempotencyKey | string | required, 8–100 chars; reuse it on retry to avoid double charges |

Output on success: `{ order: Order }`. On refusal or decline, an error result with code
`MANDATE_*`, `OVER_PER_PURCHASE_CAP`, `OVER_REMAINING_BUDGET`, `CATEGORY_NOT_ALLOWED`,
`OUT_OF_STOCK`, `PRICE_CHANGED`, `PAYMENT_DECLINED` or `IDEMPOTENCY_KEY_REUSED`.

## Tool descriptions

Each tool's `description` states the units (cents, EUR), the fact that limits come from the
mandate, and the retry rule for `idempotencyKey`. SC-004a requires that a scripted agent
can complete a purchase from `tools/list` alone, with no other documentation.

## Contract tests

- `tools/list` returns exactly the four tools with input schemas matching the tables above.
- Each tool succeeds with a valid key and writes one activity entry.
- `checkout` above the per-purchase cap returns an `isError` result with code
  `OVER_PER_PURCHASE_CAP`, and no order exists.
- `checkout` replayed with the same `idempotencyKey` returns the same order; there is 1
  payment row.
- A revoked key, or a key of an expired, revoked or exhausted mandate, is refused (HTTP 401
  for an unknown or revoked key; a `MANDATE_*` error for a key whose mandate is not
  active).
- SC-004a: a scripted MCP client given only the URL and a key lists tools, searches, and
  completes a purchase.
