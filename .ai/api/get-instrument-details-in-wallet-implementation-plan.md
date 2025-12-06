# API Endpoint Implementation Plan: GET /api/instruments/:id

## 1. Endpoint Overview
- Provide authenticated users with detailed information about a single instrument, including monetary values in grosze and formatted PLN, ensuring the instrument belongs to the requester and is not soft-deleted.
- Serve as the single source of truth for instrument detail views across the application.

## 2. Request Details
- HTTP Method: GET
- URL Structure: `/api/instruments/:id`
- Parameters:
  - Required Path: `id` (UUID string identifying the instrument)
  - Optional Query: none
- Headers:
  - `Authorization: Bearer <supabase_auth_token>` (required)
- Request Body: none
- Validation:
  - Use Zod schema to assert `id` is a valid UUID before querying Supabase.
  - Reject requests without a bearer token prior to executing any database calls.

## 3. Response Details
- Success (200):
  - Body contains `{ "data": InstrumentDto }` where `InstrumentDto` matches `src/types.ts` (id, wallet_id, type, name, optional short_description, invested/current/goal values in grosze + PLN strings, created_at, updated_at).
  - Monetary formatting: convert grosze integers to PLN strings via existing currency utility (or add helper in `src/lib/formatters/currency.ts`).
- Error Shapes:
  - 400: `{ "error": "Invalid instrument id" }`
  - 401: `{ "error": "Unauthorized" }`
  - 403: `{ "error": "Forbidden" }`
  - 404: `{ "error": "Instrument not found" }`
  - 500: `{ "error": "Internal server error" }`
- DTOs/Models Used:
  - Response: `InstrumentDto`
  - Internal enum: `InstrumentType`
  - Utility: `CurrencyDualFormat` for formatting logic.

## 4. Data Flow
- Astro route handler reads Supabase client and authenticated user id from `locals` (set by middleware/auth layer).
- Validate the `id` path parameter using Zod.
- Invoke `instrumentService.getInstrumentById({ supabase, ownerId, instrumentId })` located (or added) in `src/lib/services/instruments`, isolating database access and mapping logic.
- Service performs a single Supabase query on `instruments` selecting required columns, scoped by `id`, `owner_id`, and `deleted_at IS NULL`.
- If no row returned, service signals `notFound` to route layer (e.g., via discriminated union result or throwing custom `NotFoundError`).
- On success, service maps Supabase row to `InstrumentDto`, handling grosze→PLN conversions via shared formatter and ensuring nullables remain null.
- Route returns JSON response with status 200 and `{ data: dto }`.
- Any thrown domain errors propagate to route-level error translator; unexpected errors are logged and surfaced as 500.

## 5. Security Considerations
- Require valid Supabase session; reject requests missing/invalid bearer token with 401 before DB work.
- Enforce ownership: query filters by `owner_id = authUserId`; respond with 403 when row exists for id but owner differs (service can detect by re-querying without owner filter if needed, or treat as 404 to avoid enumeration—decide per product policy; prefer 403 per spec while preventing timing leaks).
- Exclude soft-deleted records via `deleted_at IS NULL`.
- Avoid exposing other wallet metadata; return only fields defined in `InstrumentDto`.
- Use parameterized Supabase query to mitigate injection.
- Ensure logging of sensitive data avoids exposing bearer tokens or monetary info unnecessarily.

## 6. Error Handling
- Validation failure (invalid UUID) → 400 without touching database.
- Missing/expired token from Supabase auth middleware → 401.
- Ownership violation → 403 (service returns specific error when instrument exists but owner mismatched).
- Instrument absent or soft-deleted → 404.
- Supabase errors/timeouts → 500, log via centralized logger and optionally emit to monitoring (future error table integration can hook here).
- Ensure consistent JSON error envelope `{ error: string }` for all non-200 responses.

## 7. Performance Considerations
- Supabase query uses existing index `idx_instruments_wallet_deleted`; filtering by `id` is primary key lookup (O(1)).
- Select only required columns to minimize payload.
- Leverage cached formatter/helper utilities to avoid repeated Intl instantiation.
- Ensure service execution short-circuits on validation/auth failures before database access.
- Monitor for N+1 issues (not expected; single row lookup).

## 8. Implementation Steps
1. Add/confirm `instrumentService.getInstrumentById` in `src/lib/services/instruments` with typed interface, leveraging Supabase client and returning discriminated union (`{ ok: true, instrument }` | `{ ok: false, reason }`).
2. Implement Supabase query selecting the instrument by `id`, `owner_id`, and `deleted_at IS NULL`; detect owner mismatch by fallback query if needed for 403 response.
3. Reuse or add currency formatting helper to derive PLN strings from grosze totals, ensuring rounding and null-safe goal handling.
4. Create Zod schema for path params (`instrumentIdParamSchema`) in route file or shared validator module.
5. Implement Astro API route handler at `src/pages/api/instruments/[id].ts` (or confirm existing path) that:
   - Retrieves user identity and Supabase client from `locals`.
   - Validates `id` via schema.
   - Calls service and maps result to HTTP responses (200/403/404).
6. Standardize error responses using existing HTTP helper utilities (if available) or inline helper.
7. Add structured logging for unexpected errors (include instrument id and user id, omit sensitive payloads).
8. Write unit/integration tests for service (mock Supabase) covering success, not found, owner mismatch, soft-deleted, and query failure paths.
9. Add API route tests/e2e (if harness exists) verifying status codes and payloads for success, invalid UUID, unauthorized, forbidden, and not found scenarios.
10. Update API documentation if generated from code comments or docs (ensure alignment with `.ai/api/api-plan.md`).

