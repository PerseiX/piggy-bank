# API Endpoint Implementation Plan: GET /api/wallets

## 1. Endpoint Overview
- Serve a read-only list of the authenticated user's active wallets, enriched with aggregate financial metrics computed from related instruments.
- Expose data for dashboard consumption, ensuring soft-deleted wallets/instruments remain hidden.
- Support optional sorting to enable user-controlled ordering in the UI.

## 2. Request Details
- **HTTP Method:** GET
- **URL Structure:** `/api/wallets`
- **Headers:** `Authorization: Bearer <supabase-auth-token>` (required)
- **Query Parameters:**
  - **Required:** none
  - **Optional:**
    - `sort` — enum: `name`, `updated_at` (default), `created_at`
    - `order` — enum: `asc`, `desc` (default `desc`)
- **Request Body:** none

## 3. Used Types
- `WalletListItemDto` — primary response item shape, includes wallet base fields plus `aggregates`.
- `WalletAggregatesDto` — nested aggregate payload (grosze + PLN values, percentages).
- `Wallet` — Supabase table type for raw wallet rows (used internally in the service layer).
- `Instrument` — Supabase table type to calculate aggregates.
- `CurrencyDualFormat` — helper structure for grosze ↔ PLN conversions; reuse existing utility or implement a converter if missing.

## 4. Response Details
- **Success (200):**
  - JSON body `{ data: WalletListItemDto[] }`.
  - Empty array when the user owns no active wallets.
- **Failures:**
  - `400` when query validation fails.
  - `401` when the request lacks a valid authenticated user/session.
  - `500` for unforeseen Supabase or server errors.

## 5. Data Flow
- Astro route handler (`src/pages/api/wallets/index.ts`) pulls `supabase` client from `context.locals` and extracts query parameters.
- Validate `sort` and `order` with a Zod schema, applying defaults when omitted.
- Acquire the authenticated user via `supabase.auth.getUser()`; return `401` if absent.
- Delegate to a wallet service (e.g., `src/lib/services/wallets.ts`) with signature `getWalletsForOwner({ supabase, ownerId, sort, order })`.
- Within the service:
  1. Query active wallets: `supabase.from('wallets')` filtered by `owner_id` and `deleted_at IS NULL`, ordered by the validated sort.
  2. If wallets exist, fetch all active instruments in a single query using `in('wallet_id', walletIds)` and `deleted_at IS NULL`.
  3. Group instruments by wallet and compute aggregates (target/current/invested sums, progress %, performance %). Default to `0` when sums are empty to avoid division by zero.
  4. Convert monetary values to PLN strings via a shared currency utility, producing `CurrencyDualFormat` fields.
  5. Map each wallet to `WalletListItemDto` with `aggregates` populated.
- Route returns `{ data: mappedWallets }` with HTTP 200.

## 6. Security Considerations
- Enforce authentication using the Supabase session in `context.locals.supabase`; reject unauthenticated access with `401`.
- Scope all queries by `owner_id` to prevent horizontal privilege escalation.
- Filter out soft-deleted wallets and instruments (`deleted_at IS NULL`).
- Avoid sending raw monetary integers only—always pair with PLN string formatting to prevent misinterpretation in clients.
- Sanitize/validate query parameters server-side to prevent injection and runtime errors.

## 7. Error Handling
- **ValidationError (Zod):** respond `400` with message detailing invalid parameter; log with contextual metadata.
- **AuthError:** if `getUser()` fails or returns `null`, respond `401` with a generic auth error payload.
- **Supabase query errors:** catch and log detailed error (status, code, query context); respond `500` with safe message.
- **Unexpected exceptions:** log stack trace via shared logger and respond `500`.
- Logging strategy: leverage existing logging utility (or `console.error` as fallback) with structured payload (`event`, `ownerId`, `sort`, `order`, `error`). No dedicated error table currently; document if future persistence is needed.

## 8. Performance
- Utilize partial indexes (`idx_wallets_owner_deleted`, `idx_instruments_wallet_deleted`) by filtering with `owner_id` and `deleted_at` as described in the DB plan.
- Batch instrument retrieval via `in` query to avoid N+1 requests.
- Minimize data transfer by selecting only fields required for DTO construction.
- Consider pagination support later if wallet counts grow; current endpoint returns entire set per spec.

## 9. Implementation Steps
1. Create Zod schema in the API route for `sort` and `order`, with defaults and helpful error messages.
2. Implement or extend a currency formatting utility to convert grosze to PLN strings consistently.
3. Add wallet service helper (`getWalletsForOwner`) under `src/lib/services/wallets.ts`, encapsulating data fetching and aggregate computation logic.
4. Implement the Astro route handler (`src/pages/api/wallets/index.ts`): authenticate user, validate input, call the service, map to DTOs, and return JSON.
5. Add structured error handling in the route: convert known errors to HTTP 400/401, and fallback to 500 with logging.
6. Write unit tests for the service (aggregate calculations, ordering) and integration tests for the route (using mocked Supabase client) to cover success and failure paths.
7. Update API documentation or `.ai/api-plan.md` references if needed to reflect final behavior and any new utilities.

