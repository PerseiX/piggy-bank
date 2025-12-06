# API Endpoint Implementation Plan: GET /api/instruments/:id/value-changes

## 1. Endpoint Overview
- Serve historical value change entries for a single, active instrument owned by the authenticated user.
- Compute `delta` and `direction` fields from stored grosze values and format dual PLN strings before returning.
- Enforce ownership and soft-delete protections so users cannot access other users’ instrument history.

## 2. Request Details
- HTTP Method: GET
- URL Structure: `/api/instruments/:id/value-changes`
- Headers: `Authorization: Bearer <supabase_auth_token>` (required)
- Parameters:
  - Required: `id` (path parameter, UUID v4 string identifying the instrument)
  - Optional: none for MVP (future pagination could add query params)
- Request Body: none

## 3. Response Details
- **Success 200**: `{ data: ValueChangeDto[] }` ordered by `created_at` descending (most recent first). Empty arrays are valid when no history exists.
- ValueChangeDto fields:
  - Identifiers: `id`, `instrument_id`, `created_at`
  - Monetary values: `before_value_grosze`, `before_value_pln`, `after_value_grosze`, `after_value_pln`
  - Computed metrics: `delta_grosze`, `delta_pln`, `direction` (`increase` | `decrease` | `unchanged`)
- Error payloads reuse shared error response helper (e.g., `{ error: { message, code, correlationId } }`).

## 4. Data Flow
1. Astro route `src/pages/api/instruments/[id]/value-changes.ts` extracts `id` from `context.params` and validates it with Zod (`z.object({ id: z.string().uuid() })`).
2. Retrieve authenticated user via `context.locals.supabase.auth.getUser()` (or equivalent helper); short-circuit with 401 if absent.
3. Delegate to domain service `getInstrumentValueChangeHistory` located at `src/lib/services/instrumentValueChanges/getInstrumentValueChangeHistory.ts`, passing `{ supabase, instrumentId: id, ownerId: user.id }`.
4. Inside the service:
   - Query `instruments` table filtering by `id`, `owner_id`, and `deleted_at IS NULL` to assert existence/ownership. Return `NotFoundError` or `ForbiddenError` as needed.
   - Query `instrument_value_changes` with filters `instrument_id = id`, order `created_at` DESC leveraging index `idx_value_changes_instrument_created`.
   - Map each record to `ValueChangeDto`: convert grosze to PLN using shared formatter, compute `delta = after - before`, derive `direction` via comparison.
5. Route serializes `{ data }` on success with status 200. On known domain errors, translate to HTTP 403/404; on validation errors return 400; log and return 500 for unexpected failures.
6. Include structured logging (e.g., `logApiError`) with correlation IDs for troubleshooting.

## 5. Security Considerations
- **Authentication**: Deny requests without a valid Supabase session before issuing queries.
- **Authorization**: Always filter by `owner_id` and `deleted_at IS NULL` when reading the instrument; return 403 if owner mismatch, 404 if not found.
- **Input Validation**: Enforce UUID format on `id`; reject malformed identifiers with 400 to avoid injection/vector abuse.
- **Data Leakage Prevention**: Do not disclose whether an instrument exists when unauthorized; generic messaging for 403/404.
- **Rate Limiting (Future)**: Consider middleware throttling for repeated history access.
- **Logging Hygiene**: Avoid logging raw tokens; mask sensitive identifiers when writing error logs.

## 6. Error Handling
- 400 Bad Request: Path parameter fails UUID validation.
- 401 Unauthorized: Supabase session absent or invalid.
- 403 Forbidden: Instrument located but `owner_id` differs from authenticated user (expose generic denial message).
- 404 Not Found: Instrument missing or soft-deleted after authorization filters.
- 500 Internal Server Error: Supabase failures, unexpected mapping issues, or formatter errors. Log with correlation ID; include ID in response payload.

## 7. Performance Considerations
- Utilize index `idx_value_changes_instrument_created` by filtering on `instrument_id` and ordering by `created_at DESC`.
- Select only required columns from Supabase queries to minimize payload size.
- Compute monetary formatting and deltas in TypeScript using integers to avoid floating-point errors.
- Consider pagination parameters in future if history grows large (plan for `limit/offset` once needed).

## 8. Implementation Steps
1. **Scaffold Validation & Error Helpers**: Confirm presence (or create) shared Zod schema snippets and `createErrorResponse`/`logApiError` utilities under `src/lib`. Introduce correlation ID helper if missing.
2. **Add Currency Formatter**: Create `src/lib/formatters/currency.ts` (or similar) exporting `formatGroszeToDual(grosze: number): CurrencyDualFormat` for reuse across endpoints.
3. **Create Domain Errors**: Define reusable error classes (e.g., `InstrumentNotFoundError`, `InstrumentForbiddenError`) in `src/lib/errors.ts` if not already available.
4. **Implement Service Layer**: Add `src/lib/services/instrumentValueChanges/getInstrumentValueChangeHistory.ts` encapsulating Supabase lookups, ownership enforcement, mapping to `ValueChangeDto`, and error translation (throw domain errors).
5. **Build API Route**: Implement handler in `src/pages/api/instruments/[id]/value-changes.ts` that validates input, fetches auth user, invokes the service, and maps domain errors to HTTP responses per section 6.
6. **Wire Logging**: Ensure all failure branches log through the structured logger with contextual metadata (instrumentId, ownerId, correlationId).
7. **Add Tests**: Write unit tests for the service (ownership, delta/direction computation, empty history) and integration tests for the route using mocked Supabase clients.
8. **Documentation & QA**: Update `.ai/api/api-plan.md` if response nuances change, run lint/tests, and document any new utilities for future reuse.

