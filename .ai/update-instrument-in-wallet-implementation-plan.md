# API Endpoint Implementation Plan: PATCH /api/instruments/:id

## 1. Endpoint Overview
- Partially update an existing instrument owned by the authenticated user while keeping wallet ownership immutable.
- Support selective field updates (type, name, descriptions, monetary targets) and convert PLN string inputs to grosze for storage.
- Return the normalized instrument snapshot (`InstrumentUpdatedDto`) so clients can refresh caches with authoritative values and timestamps.

## 2. Request Details
- **HTTP Method:** `PATCH`
- **Route Pattern:** `/api/instruments/:id`
- **Headers:**
  - `Authorization: Bearer <supabase_auth_token>` (required)
  - `Content-Type: application/json` (required)
- **Path Parameters:**
  - `id` — UUID of the instrument; reject malformed IDs before querying Supabase.
- **Body Schema (all fields optional but require at least one present):**
  - `type?` — enum `InstrumentType`; limit to `Bonds`, `ETF`, `Stocks`.
  - `name?` — trimmed string 1–100 chars; reject control characters; preserve casing but compare case-insensitively for uniqueness.
  - `short_description?` — trimmed string up to 500 chars; treat empty string as `null`.
  - `invested_money_pln?` — decimal string with max two fraction digits, ≥0.00.
  - `current_value_pln?` — same validation as invested.
  - `goal_pln?` — decimal string ≥0.00; absence keeps value unchanged; empty string clears to `null`.
- **Validation Approach:** Use strict Zod schema (`updateInstrumentSchema`) that trims/coerces strings, validates decimal patterns, and `.superRefine` ensures at least one field provided. Perform UUID guard via shared helper before decoding body.
- **Command Model:** `UpdateInstrumentCommand` (from `src/types.ts`).

## 3. Response Details
- **Success 200:** JSON envelope `{ data: InstrumentUpdatedDto }`, including grosze integers and formatted PLN strings for monetary fields plus `created_at`/`updated_at`.
- **Error Status Codes:**
  - `400` — invalid UUID/body, decimal parsing failure, or parent wallet soft-deleted.
  - `401` — missing/invalid session.
  - `403` — instrument exists but owned by another user.
  - `404` — instrument not found or soft-deleted.
  - `409` — name already exists within the wallet.
  - `500` — unexpected Supabase or runtime failure.
- **DTO Usage:** Response uses `InstrumentUpdatedDto`; service returns domain entity mapped via shared `mapInstrumentToDto` helper.

## 4. Data Flow
1. **API Route:** Implement `src/pages/api/instruments/[id].ts` with `export const prerender = false` and a `PATCH` handler.
2. **Auth Context:** Retrieve Supabase client from `context.locals.supabase`; fetch current user via `supabase.auth.getUser()` helper. If absent, respond `401` immediately.
3. **Input Handling:**
   - Validate `id` with UUID utility before reading body.
   - Parse JSON safely; handle parse errors with `400`.
   - Run `updateInstrumentSchema.safeParseAsync`; map Zod issues to structured `400` response.
4. **Service Invocation:** Pass `supabase`, `user.id`, `instrumentId`, and validated `UpdateInstrumentCommand` to `updateInstrument` service in `src/lib/services/instruments/updateInstrument.ts`.
5. **Service Responsibilities:**
   - Fetch instrument joined with wallet metadata (`wallet_id`, `owner_id`, `deleted_at`) scoped to `id` and `deleted_at IS NULL`.
   - Enforce owner match (return not-found or forbidden per policy), and detect parent wallet soft-delete (return `400` per spec even if cascade already applied).
   - Short-circuit if no effective field changes (return current DTO without DB call) while preserving idempotency.
   - Normalize optional fields (trim, empty-to-null) and convert decimal strings to grosze via shared currency helpers (`parsePlnToGrosze`, `formatGroszeToPln`).
   - When `name` changes, proactively check for duplicates within same wallet (`eq('wallet_id', walletId)`, `is('deleted_at', null)`, `eq('name', name)`); translate conflicts to domain error.
   - Execute Supabase update using `update(patch).eq('id', id).eq('owner_id', userId).select(...).single()` to fetch updated row atomically.
   - Catch SQLSTATE `23505` (unique violation) and map to conflict error if pre-check missed.
   - Map Supabase row to `InstrumentUpdatedDto` using shared mapper that supplements PLN strings.
6. **Route Response:** Serialize `{ data: dto }` with `200` on success; use centralized error-to-HTTP mapper for domain errors vs. unexpected failures.
7. **Side Effects:** DB trigger will create value change record when `current_value_grosze` changes; no additional action required but ensure service does not suppress update when value differs only by formatting.

## 5. Security Considerations
- **Authentication:** Require valid Supabase session; never trust client-supplied owner IDs.
- **Authorization:** Scope fetch/update queries by both `id` and `owner_id`; respond with `404` for unknown/soft-deleted instrument to reduce resource enumeration, `403` only when spec explicitly needs it.
- **Soft-Delete Enforcement:** Filter `deleted_at IS NULL` and return `404` if instrument is soft-deleted; if parent wallet soft-deleted, return `400` per API spec before attempting write.
- **Input Hardening:** Trim inputs, reject control characters, bound lengths, and enforce decimal format to guard against injection and constraint violations.
- **Immutable Wallet Binding:** Do not allow `wallet_id` changes; rely on DB trigger to block but also avoid including `wallet_id` in update payload.
- **Secrets Handling:** Exclude tokens/PII from logs; include only user id and instrument id when logging failures.

## 6. Error Handling
- Normalize validation failures into `{ error: { code: "VALIDATION_ERROR", details: [...] } }` with HTTP 400.
- Map domain errors emitted by service:
  - `InstrumentNotFoundError` / `InstrumentSoftDeletedError` → 404.
  - `InstrumentForbiddenError` → 403.
  - `ParentWalletSoftDeletedError` → 400.
  - `InstrumentNameConflictError` (pre-check or SQLSTATE `23505`) → 409.
- Wrap unforeseen Supabase or runtime issues in `InternalServerError`, log details, and respond 500 with generic message.
- Catch JSON parse and UUID validation exceptions early to avoid hitting service.
- Since no error table exists, log via shared logger (`logApiError`) with correlation metadata for future tracing.

## 7. Performance
- Single-row fetch/update leveraging indexes `idx_instruments_wallet_deleted` and unique constraint ensures queries are O(1).
- Limit selected columns to those required for DTO to reduce payload size.
- Reuse single Supabase client per request; avoid duplicate auth calls.
- Prevent redundant updates by diffing payload vs. existing values to skip unnecessary write (while still returning 200 with current DTO).
- Ensure decimal parsing helpers are efficient and reused (avoid recreating regex per call).

## 8. Implementation Steps
1. **Validation Schema:** Extend `src/lib/validation/instruments.ts` with `updateInstrumentSchema` (strict, partial, at-least-one-field) plus helpers for trimming, decimal coercion, and empty-string normalization.
2. **Currency Utilities:** Confirm `parsePlnToGrosze` / `formatGroszeToPln` exist in `src/lib/formatters/currency.ts`; add missing helpers/tests as needed for reuse.
3. **Domain Errors:** Add/update error classes or factory functions in `src/lib/errors/instruments.ts` covering not found, forbidden, soft-deleted, conflict, and validation bridging.
4. **Service Layer:** Implement `src/lib/services/instruments/updateInstrument.ts` encapsulating lookup, guards, diffing, normalization, Supabase update, and DTO mapping (reuse `mapInstrumentToDto`).
5. **DTO Mapper:** Ensure shared mapper handles grosze↔PLN conversions; extend if necessary for reuse across create/update responses.
6. **API Route:** Create or update `src/pages/api/instruments/[id].ts` to expose `PATCH`, invoking validation, service, and error mapper; ensure `prerender = false` and consistent response envelope.
7. **Logging & Error Mapping:** Centralize error-to-HTTP translation in shared utility (e.g., `resolveApiError`) and integrate structured logging with user/instrument context.
8. **Testing:** Write unit tests for validation schema and currency helpers; add service tests mocking Supabase for success and error paths (not found, forbidden, conflict, soft-deleted, value change). If API integration tests exist, cover 200/400/401/403/404/409 flows.
9. **Docs & QA:** Update `.ai/api-plan.md` or other docs if payload shape changes; run lint/test suites to ensure compliance.

