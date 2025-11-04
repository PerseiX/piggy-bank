# API Endpoint Implementation Plan: GET /api/wallets/:walletId/instruments

## 1. Endpoint Overview
- Provide authenticated users with the list of active instruments stored in a specific wallet that they own.
- Respect wallet and instrument soft-delete semantics so deleted items never appear.
- Support optional sorting on selected fields and return monetary values in both grosze and formatted PLN strings.

## 2. Request Details
- **HTTP Method**: GET
- **URL**: `/api/wallets/:walletId/instruments`
- **Headers**: `Authorization: Bearer <supabase_auth_token>` (required)
- **Parameters**:
  - **Path** (required): `walletId` as a UUID string.
  - **Query** (optional):
    - `sort` ∈ `{"name", "updated_at", "type", "current_value_grosze"}` (default `updated_at`).
    - `order` ∈ `{"asc", "desc"}` (default `desc`).
- **Request Body**: None.
- **Validation**:
  - Zod schema in `src/lib/validation/instruments.ts` for path and query values (`z.string().uuid()` for `walletId`; enums for `sort`/`order`).
  - Normalise query params (trim, lowercase) before validation; apply defaults inside the schema.
  - Reject unsupported or duplicate query keys with `400` and structured validation error payload.

## 3. Response Details
- **200 OK**: JSON payload `{ data: InstrumentDto[] }`, where every item includes `id`, `wallet_id`, `type`, `name`, `short_description`, dual monetary fields (`invested_money_grosze` + `invested_money_pln`, etc.), and timestamps.
- **Used Types**:
  - `InstrumentDto` from `src/types.ts` for each item.
  - New `InstrumentListResponse` type alias (e.g., `{ data: InstrumentDto[] }`) exported alongside the route or a shared response types module.
- Monetary string fields produced with a helper that formats grosze to decimal strings (`"0.00"` format), returning `null` when `goal_grosze` is `null`.

## 4. Data Flow
1. Astro route at `src/pages/api/wallets/[walletId]/instruments.ts` exports `export const prerender = false` and a `GET` handler.
2. Handler obtains `context.locals.supabase` typed with `SupabaseClient` from `src/db/supabase.client.ts` and extracts the bearer token from the `Authorization` header; call `supabase.auth.getUser(token)`.
3. If the auth call fails or returns no user, respond with `401` using shared error helper.
4. Validate `context.params.walletId` and `context.url.searchParams` via the Zod schema to produce a typed `ListWalletInstrumentsQuery` object (`walletId`, `sort`, `order`).
5. Fetch wallet metadata with `supabase.from("wallets")` selecting only `id`, `owner_id`, `deleted_at`; filter by `id = walletId` and `deleted_at IS NULL`.
6. If the wallet does not exist or is soft-deleted, return `404`. If it exists but `owner_id !== user.id`, return `403`.
7. Delegate to `listWalletInstruments({ supabase, walletId, sort, order })` service located at `src/lib/services/instruments/listWalletInstruments.ts`.
8. Service queries `instruments` table with filters `wallet_id = walletId` and `deleted_at IS NULL`, selecting only fields needed by `InstrumentDto`. Apply `order(sortColumn, { ascending })`, mapping logical `sort` values to real column names in a constant whitelist.
9. Map rows to DTOs using `mapInstrumentRecordToDto` helper in `src/lib/services/instruments/mappers.ts` (or within the service) that converts grosze integers to PLN strings via `formatGroszeToPln` utility in `src/lib/utils/currency.ts`.
10. Return `{ data }` from the route using a shared `jsonResponse` helper; log and translate errors using centralized error handling.

## 5. Security Considerations
- **Authentication**: Enforce bearer token validation before any database access.
- **Authorization**: Verify wallet ownership against the authenticated user ID; refuse cross-user access with a `403` without leaking wallet existence.
- **Soft Delete**: Treat wallets/instruments with `deleted_at` as non-existent (404 or omitted) to avoid resurrecting deleted data.
- **Parameter Sanitization**: Use strict enum validation and column mapping for sorting to prevent SQL injection or arbitrary column access.
- **Least Privilege**: Reuse the Supabase client from request context rather than instantiating service-role clients with broader permissions.
- **Auditing**: Capture structured logs (`endpoint`, `walletId`, `userId`, `errorCode`) via `logApiError` helper to support future monitoring or persistence in an error table.

## 6. Error Handling
- **400 BAD REQUEST**: Invalid UUID or query values (Zod schema failure). Include field-level details in `{ error: { code: "VALIDATION_ERROR", message, details } }`.
- **401 UNAUTHORIZED**: Missing `Authorization` header or Supabase `getUser` failure (`UNAUTHORIZED`).
- **403 FORBIDDEN**: Authenticated user does not own the wallet.
- **404 NOT FOUND**: Wallet missing or soft-deleted; also applies if wallet check fails but ownership cannot be confirmed.
- **500 INTERNAL SERVER ERROR**: Unexpected Supabase errors, DTO mapping issues, or unhandled exceptions; log via `logApiError` before returning `{ error: { code: "SERVER_ERROR", message } }`.

## 7. Performance
- Queries leverage `idx_instruments_wallet_deleted` and `idx_wallets_owner_deleted` indexes by filtering on `wallet_id` and `deleted_at`.
- Select only necessary columns instead of `*` to reduce payload size.
- Avoid N+1 requests: single query retrieves instruments; wallet ownership check performed once before list query.
- Sorting uses indexed columns (`updated_at`, `name` via citext); if heavier sorts become an issue, consider pagination parameters in future iterations.

## 8. Implementation Steps
1. Create Zod schemas (`walletIdParamSchema`, `listWalletInstrumentsQuerySchema`) and exported `ListWalletInstrumentsQuery` type in `src/lib/validation/instruments.ts`.
2. Add currency utility `formatGroszeToPln(grosze: number): string` and helper to handle nullable goals under `src/lib/utils/currency.ts` if not already available.
3. Implement DTO mapper `mapInstrumentRecordToDto` (or similar) that accepts Supabase row data and returns `InstrumentDto` using currency helpers.
4. Build service `listWalletInstruments.ts` encapsulating Supabase query, column whitelist for sorting, and DTO mapping; export typed function signature using project Supabase client type.
5. Implement Astro API route `src/pages/api/wallets/[walletId]/instruments.ts` with `GET` handler that performs auth, validation, wallet ownership checks, service invocation, and standardized JSON/error responses; export `prerender = false`.
6. Integrate or extend shared response/error helpers (`jsonResponse`, `errorResponse`, `logApiError`) to keep handler concise and consistent.
7. Write unit tests for validation schema and service (mock Supabase client for sorting/soft-delete filtering), plus integration-level route test if testing harness exists.
8. Update API documentation and run lint/tests to ensure adherence to project standards before shipping.

