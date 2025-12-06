# API Endpoint Implementation Plan: GET /api/wallets/:id

## 1. Endpoint Overview
- Serve a detailed view of a single active wallet that belongs to the authenticated user.
- Return wallet metadata, computed aggregate metrics, and all active instruments formatted for UI consumption.
- Enforce ownership and soft-delete rules so that users cannot access deleted or foreign wallets.

## 2. Request Details
- HTTP Method: GET
- URL Structure: `/api/wallets/:id`
- Headers: `Authorization: Bearer <supabase-auth-token>` (required)
- Parameters:
  - Required: `id` (path parameter, UUID string)
  - Optional: none
- Request Body: none

## 3. Used Types
- `WalletDetailDto` — response contract containing wallet metadata, aggregates, and instruments.
- `WalletAggregatesDto` — computed sums (target/current/invested) and percentage metrics.
- `InstrumentDto` — nested instrument payload with dual-format monetary values.
- `CurrencyDualFormat` — helper for grosze ↔ PLN conversions; introduce shared formatter if one does not exist.
- Supabase entity types `Wallet` and `Instrument` for internal typing in the service layer.

## 4. Response Details
- **200 OK**: JSON payload `{ data: WalletDetailDto }` where `aggregates` expose grosze integers plus PLN strings and `instruments` lists active entries ordered by `created_at` ascending for stable presentation.
- **400 Bad Request**: Path parameter fails UUID validation.
- **401 Unauthorized**: No authenticated Supabase user associated with the request.
- **403 Forbidden**: Wallet exists but `owner_id` does not match the authenticated user.
- **404 Not Found**: Wallet missing or soft-deleted (after applying ownership and `deleted_at IS NULL` filters).
- **500 Internal Server Error**: Supabase failures, numeric conversion issues, or unexpected exceptions.

## 5. Data Flow
1. Astro API route `src/pages/api/wallets/[id].ts` extracts `supabase` from `context.locals`, reads `context.params.id`, and validates it via a Zod schema (`z.string().uuid()`).
2. Retrieve the authenticated user with `supabase.auth.getUser()`; short-circuit with 401 if absent.
3. Delegate to a wallet domain service (e.g., `src/lib/services/wallets/getWalletDetail.ts`) with inputs `{ supabase, walletId, ownerId }`.
4. Inside the service, query `wallets` with filters `id = walletId`, `owner_id = ownerId`, `deleted_at IS NULL`, selecting only fields needed for DTO mapping; use `maybeSingle()` and convert a `null` result into a typed `NotFoundError`.
5. Fetch active instruments for the wallet in a single query (`supabase.from("instruments")`) filtering by `wallet_id`, `owner_id`, and `deleted_at IS NULL`; order by `created_at` for determinism.
6. Compute aggregates in TypeScript: sum `goal_grosze`, `current_value_grosze`, and `invested_money_grosze`; guard against `null` by defaulting to `0`. Derive `progress_percent` (0 when `target_grosze` is 0) and `performance_percent` (0 when `invested_sum_grosze` is 0).
7. Use a shared utility such as `formatCurrencyFromGrosze(grosze: number): CurrencyDualFormat` to attach PLN strings (two decimal places) for each grosze total and per-instrument fields.
8. Map each instrument to `InstrumentDto`, attaching `wallet_id` and formatted monetary fields.
9. Combine wallet base fields, computed aggregates, and mapped instruments into `WalletDetailDto` and return it to the route.
10. Route serializes `{ data }` to JSON with status 200; catches domain errors to map them to the HTTP codes outlined above.

## 6. Security Considerations
- **Authentication**: Require a valid Supabase session; reject anonymous requests before hitting the database.
- **Authorization**: Always filter by `owner_id` and `deleted_at IS NULL`; never trust client-provided wallet IDs without ownership validation to prevent IDOR.
- **Input Validation**: Enforce UUID structure on the path parameter using Zod to avoid malformed queries and potential injection vectors.
- **Soft-Delete Compliance**: Exclude wallets and instruments with `deleted_at` set to prevent data leakage of archived records.
- **Error Hygiene**: Return generic messages for 403/404 to avoid exposing whether a wallet exists; log detailed errors server-side only.
- **Secrets Handling**: Use `context.locals.supabase` (already scoped) instead of instantiating new clients or exposing service-role keys.

## 7. Error Handling
- Wrap Supabase calls in try/catch; translate known failure modes into HTTP errors (400/401/403/404) and default to 500 otherwise.
- Log validation and authorization failures with context (`walletId`, `ownerId`) via a structured logger helper (create `logApiError` if absent) or `console.error` as interim.
- Normalize `null` wallet fetches to a `NotFoundError`; differentiate from Supabase exceptions to avoid leaking internal errors.
- Ensure numeric conversions throw explicit errors when unexpected `null` or negative values appear; capture and return 500 while logging the incident.
- For 500 responses, include a correlation ID (UUID) in the log and response payload to support debugging.

## 8. Performance Considerations
- Rely on existing indexes `idx_wallets_owner_deleted` and `idx_instruments_wallet_deleted` by keeping filters on `owner_id`, `wallet_id`, and `deleted_at`.
- Select only necessary columns from Supabase to reduce payload size (avoid `select(*)`).
- Execute wallet and instrument queries sequentially to short-circuit if the wallet is missing; reuse a single Supabase client instance.
- Cache currency formatter logic (pure function) and reuse computed sums to prevent redundant calculations.
- Consider memoizing aggregate computations within the service if reused elsewhere to avoid duplicate work in future endpoints.

## 9. Implementation Steps
1. Scaffold Zod validation schema for the path parameter and shared error helpers (e.g., `createErrorResponse`) if not already present.
2. Add a currency formatting utility under `src/lib/services/currency/format.ts` (or similar) that converts grosze to `{ grosze, pln }` with two-decimal precision.
3. Implement `getWalletDetail` service under `src/lib/services/wallets/`, encapsulating Supabase queries, aggregate math, and DTO mapping; export typed error classes (`WalletNotFoundError`, `WalletForbiddenError`).
4. Create Astro route handler `src/pages/api/wallets/[id].ts` that validates input, retrieves the authenticated user, invokes the service, and maps domain errors to HTTP responses.
5. Introduce a lightweight logging helper (if missing) for structured error logging; hook it into error branches in both service and route.
6. Write unit tests for the service (aggregate calculations, auth enforcement, error translation) and integration tests for the route using mocked Supabase responses.
7. Document the endpoint in API references (`.ai/api/api-plan.md`) if behavior deviates, and ensure linter/test suites pass.

