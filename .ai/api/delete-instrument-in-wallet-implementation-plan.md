# API Endpoint Implementation Plan: DELETE /api/instruments/:id

## 1. Endpoint Overview
- Soft-delete an authenticated user's instrument by setting `deleted_at` while leaving historical data intact.
- Ensure the target instrument belongs to the signed-in user and is currently active before performing the update.
- Return the instrument identifier and deletion timestamp so the frontend can update local state and analytics caches.

## 2. Request Details
- **HTTP Method:** DELETE
- **URL Structure:** `/api/instruments/:id`
- **Headers:** `Authorization: Bearer <supabase_auth_token>` (required); no other custom headers.
- **Path Parameters:** `id` (UUID, required) — validate with Zod `.uuid()` and trim before use.
- **Query Parameters:** None supported; reject unexpected params via schema `.strict()`.
- **Request Body:** Not used; respond with 400 if a body is present and fails JSON parsing (defensive guard against malformed clients).
- **Validation & Guards:**
  - Confirm active Supabase session (`locals.supabase.auth.getUser()` helper); return 401 on failure.
  - Parse `id`; return 400 with `invalid_id` code when malformed.
  - Service re-validates ownership (`owner_id = user.id`) and active status (`deleted_at IS NULL`) before update to avoid double deletes or horizontal privilege escalation.

## 3. Response Details
- **Success 200:** `{ "data": InstrumentDeletedDto }` where `InstrumentDeletedDto = { id: string; deleted_at: string; }` from `src/types.ts`.
- **Error Status Codes:**
  - 400 for invalid UUID or unexpected payload (`VALIDATION_ERROR`).
  - 401 when authentication fails (`UNAUTHORIZED`).
  - 403 when the instrument exists but is owned by another user (`FORBIDDEN`).
  - 404 when the instrument is missing or already soft-deleted (`NOT_FOUND`).
  - 500 for unhandled Supabase or runtime errors (`SERVER_ERROR`).
- **Error Payload Convention:** `{ "error": { "code": string; "message": string; "details?": object } }`, aligned with existing plans.

## 4. Data Flow
1. Astro route `src/pages/api/instruments/[id].ts` exports `prerender = false` and a `DELETE` handler.
2. Handler retrieves Supabase client from `context.locals.supabase` and resolves the authenticated user; respond 401 immediately if absent.
3. Use a Zod params schema (`deleteInstrumentParamsSchema`) to validate the `id` segment; on failure, return 400 without calling the service.
4. Instantiate (or reuse) an instruments service module `softDeleteInstrument({ supabase, instrumentId, ownerId, timestamp })` residing under `src/lib/services/instruments/`.
5. Service loads the instrument (`select id, owner_id, deleted_at`) scoped by `id` and `owner_id`; translate no rows to `InstrumentNotFoundError`, owner mismatch to `InstrumentForbiddenError`, and pre-existing `deleted_at` to `InstrumentAlreadyDeletedError` (mapped to 404 for idempotency).
6. When valid, generate a shared ISO timestamp (`const deletedAt = new Date().toISOString()`), execute `update` with filters `id = instrumentId`, `owner_id = ownerId`, `deleted_at IS NULL`, and request the updated row via `.select(...).single()` to get the persisted timestamp.
7. Map the Supabase result to `InstrumentDeletedDto` (helper in `src/lib/services/instruments/mappers.ts` if collection grows) and return it to the route.
8. Route serializes `{ data: dto }` with status 200. Unexpected errors are caught, logged via logging helper (see below), and converted to 500.

## 5. Security Considerations
- **Authentication:** Require valid Supabase auth token; never trust client-supplied identifiers without session verification.
- **Authorization:** Enforce ownership checks on every database read/update by comparing `owner_id` to `user.id` inside the service.
- **Soft Delete Idempotency:** Treat repeated deletes as 404 to avoid leaking active/inactive state while keeping the operation safe for retries.
- **Input Hardening:** Reject malformed UUIDs early to prevent SQL errors or injection attempts. Ignore unexpected payloads.
- **Logging Hygiene:** When logging failures, omit sensitive tokens but include request IDs/user IDs for traceability; there is no dedicated error table, so centralized logging (or `console.error` placeholder) must be used.
- **Rate Limiting (Future):** Note compatibility with global middleware if/when request throttling is added.

## 6. Error Handling
- Map Zod validation failures to 400 with code `VALIDATION_ERROR` and attach field-specific messages.
- Missing session → 401 `UNAUTHORIZED` with generic message "Authentication required".
- Ownership mismatch surfaced as domain error → 403 `FORBIDDEN`; log attempt with user/instrument IDs.
- Instrument absent or already soft-deleted → 404 `NOT_FOUND` to keep delete idempotent.
- Capture Supabase errors (network issues, constraint violations) and wrap them in `InternalServerError`; log stack trace and return 500 `SERVER_ERROR` with generic client message.
- Ensure all error responses share consistent JSON structure for frontend consumption.

## 7. Performance Considerations
- Use indexed lookups (`idx_instruments_wallet_deleted` covers `deleted_at`; add filter on `owner_id` to leverage composite indexes) to minimize query time.
- Combine ownership verification and deletion into a single update call (`update ... eq('id') ... eq('owner_id') ... is('deleted_at', null)`) to avoid race conditions and extra round trips.
- Select only necessary columns to reduce payload size; no need to fetch monetary fields for delete confirmation.
- Reuse Supabase client per request to avoid redundant authentication handshakes.
- Log slow queries (if observability tooling exists) to monitor potential index gaps.

## 8. Implementation Steps
1. **Validation Schema:** Add `deleteInstrumentParamsSchema` under `src/lib/validation/instruments.ts` (or create file) using Zod `.object({ id: z.string().uuid() })` and export helper to parse route params.
2. **Domain Errors:** Introduce error classes/enums in `src/lib/errors/instruments.ts` (or extend existing module) for `InstrumentNotFoundError`, `InstrumentForbiddenError`, `InstrumentAlreadyDeletedError`, and `InstrumentSoftDeleteFailedError` (500 fallback).
3. **Service Module:** Implement `softDeleteInstrument` in `src/lib/services/instruments/softDeleteInstrument.ts` containing the lookup, ownership check, timestamp generation, update call, and DTO mapping.
4. **DTO Mapper:** If not already available, add `mapInstrumentDeleted` helper returning `InstrumentDeletedDto` to ensure consistent formatting.
5. **API Route:** Create or extend `src/pages/api/instruments/[id].ts` with `export const prerender = false` and `export async function DELETE(context)`, orchestrating auth, validation, service invocation, and HTTP translation per Data Flow.
6. **Error Mapping & Logging:** Centralize error-to-status mapping within the route; integrate with existing logging utility (`src/lib/observability/logging.ts`) or add `logApiError({ error, userId, instrumentId })` to capture unexpected failures.
7. **Testing:** Write unit tests for the service covering success, unauthorized deletion (403), already deleted (404), and Supabase failure (500) with mocked client; add API integration test stub if framework support exists.
8. **Manual Verification & Docs:** Verify endpoint via authenticated curl/Postman call; ensure related documentation (`.ai/api/api-plan.md`) references updated behavior and coordinate with frontend to handle 404-on-repeat deletes gracefully.

