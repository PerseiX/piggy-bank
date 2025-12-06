# API Endpoint Implementation Plan: PATCH /api/wallets/:id

## 1. Endpoint Overview
- Update an existing wallet’s `name` and/or `description` for the authenticated owner while respecting soft-deletes and per-owner name uniqueness.
- Supports partial updates; unchanged fields remain untouched.
- Returns the canonical wallet snapshot (`WalletUpdatedDto`) with server-managed timestamps after persisting changes.

## 2. Request Details
- **HTTP Method:** `PATCH`
- **Route Pattern:** `/api/wallets/:id`
- **Auth:** Require valid Supabase session (Bearer token); retrieve `context.locals.supabase` user or `401`.
- **Path Params:**
  - `id` (UUID, required) — validate and normalize before use.
- **Headers:**
  - `Authorization: Bearer <token>` (required)
  - `Content-Type: application/json` (required)
- **Body Schema (`UpdateWalletCommand`):** strict Zod object with at least one field present.
  - `name?`: string, trim, 1–100 chars after trimming, reject purely whitespace, preserve case for display but compare case-insensitively for uniqueness.
  - `description?`: string | null, trim, allow empty string to clear? decide: interpret empty string as `null`, enforce ≤500 chars.
- **Validation Flow:**
  1. Parse JSON with safe guard; malformed payload → `400`.
  2. Validate schema; accumulate issues with descriptive messages using `zodErrorToResponse` helper if available.
  3. Ensure at least one field differs from stored value to avoid redundant updates; otherwise respond with `200` returning current state (idempotency) or `204`? choose `200` with unchanged data for consistency.

## 3. Response Details
- **Success (200):** `{ data: WalletUpdatedDto }` where `WalletUpdatedDto = Pick<Wallet, "id" | "name" | "description" | "created_at" | "updated_at">`.
- **Client Errors:**
  - `400` for invalid UUID/body/constraint violations.
  - `401` if auth fails.
  - `403` if wallet exists but not owned by user (alternative: 404 to avoid enumeration; decide in security section).
  - `404` if wallet missing or soft-deleted for this user.
  - `409` for per-owner name collision (case-insensitive) reported by Supabase unique index.
- **Server Errors:** `500` for unexpected Supabase errors or unhandled exceptions.

## 4. Data Flow
- Astro API route handler receives request via `src/pages/api/wallets/[id].ts` (PATCH branch) or dedicated folder.
- Obtain `supabase` and `currentUser` from `context.locals`; reject unauthenticated early.
- Validate `id` and payload with Zod utilities (`parseUuid`, `updateWalletSchema`).
- Call wallet service method (e.g., `walletService.updateWallet`) located in `src/lib/services/wallets/updateWallet.ts`:
  1. Fetch wallet by `id` scoped to `owner_id` and `deleted_at IS NULL`.
  2. If absent → `404`.
  3. Prepare update patch object only with provided fields (trimmed), converting empty description to null.
  4. Execute `supabase.from('wallets').update(...).eq('id', id).eq('owner_id', userId).select().single()` to atomically update.
  5. Handle unique constraint errors (SQLSTATE `23505`) and map to `409`.
- Service returns updated row mapped into `WalletUpdatedDto`.
- Route serializes `{ data: dto }` and sends with `200`.
- Log errors via centralized logger (console or `src/lib/observability`) since no error table exists.

## 5. Security Considerations
- **Authentication:** Use Supabase session check; return `401` if missing/invalid token.
- **Authorization:** Enforce owner scope (`owner_id = user.id`) in both lookup and update queries; optionally respond with `404` instead of `403` to prevent resource enumeration (decide but document for consistency across API).
- **Soft-delete Protection:** Ensure query filters `deleted_at IS NULL`; do not allow updates on soft-deleted wallets; respond with `404`.
- **Input Hardening:** Trim inputs, reject control characters, enforce length bounds to avoid DB constraint breaches and DoS via oversized payloads (Astro should already limit, but enforce manually).
- **Name Collision:** Let DB enforce unique index; convert Supabase error to safe message without exposing internal SQL details.
- **Audit/Logging:** Record unexpected failures with contextual metadata (user id, wallet id) but avoid logging sensitive tokens.

## 6. Error Handling
- Centralize error mapping in the route or shared helper:
  - Zod validation errors → `400` with structured message list.
  - Supabase error `code === "23505"` → `409` with message "Wallet name already in use".
  - Unauthorized (no user) → `401`.
  - Not found / soft-deleted → `404` with generic message.
  - Forbidden (owner mismatch if separate check) → `403`.
  - Unexpected Supabase/network issues → log + `500` with `"Something went wrong"`.
- Ensure try/catch around service call; wrap thrown errors into standardized `ApiError`/`HttpError` if available or introduce such helper in `src/lib/errors`.
- Since no error table is defined, log to stdout/Observability layer and revisit once table exists.

## 7. Performance Considerations
- Single row update; minimal load. Use indexed lookups (`owner_id`, `id`) aligning with `idx_wallets_owner_deleted`.
- Select only necessary columns (`select('id,name,description,created_at,updated_at')`).
- Avoid extra round-trips: fetch and update in single query by chaining `update(...).select().single()`.
- Debounce client-side invocations (outside scope) but mention idempotency to handle retries gracefully.

## 8. Implementation Steps
1. **Define Schema:** Create `updateWalletSchema` in `src/lib/validation/wallets.ts` (or equivalent) using Zod, including helper to ensure at least one field provided and trimmed conversions.
2. **Service Layer:** Add `src/lib/services/wallets/updateWallet.ts` exporting `updateWallet(supabase, userId, id, command)` that encapsulates fetch, authorization, update, and error translation.
3. **API Route Integration:** Modify `src/pages/api/wallets/[id].ts` (or create if absent) to route PATCH requests through validation and service, ensuring consistent response envelope and error handling.
4. **Utility Enhancements:** Ensure common helpers exist for `parseJsonBody`, `mapSupabaseError`, and `normalizeString`; add/adjust as needed in `src/lib/utils`.
5. **Testing:** Write unit tests for validation (if testing stack available) and integration tests hitting the API route with mocked Supabase responses covering 200, 400, 401, 404, 409 paths.
6. **Logging & Monitoring:** Use existing logger to capture error context; ensure no PII in logs.
7. **Documentation:** Update API docs (e.g., `.ai/api/api-plan.md` if needed) and changelog referencing this plan.

