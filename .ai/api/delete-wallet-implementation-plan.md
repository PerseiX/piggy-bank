# API Endpoint Implementation Plan: DELETE /api/wallets/:id

## 1. Endpoint Overview
- Soft-delete an authenticated user's wallet by setting the `deleted_at` timestamp instead of removing the record.
- Leverage the PostgreSQL trigger to cascade the soft-delete to all related instruments so they disappear from user queries while preserving history.

## 2. Request Details
- HTTP Method: DELETE
- URL Structure: `/api/wallets/:id`
- Parameters:
  - Required:
    - Path `id`: Wallet UUID targeted for deletion.
    - Header `Authorization`: `Bearer <supabase_auth_token>` retrieved from the user's session.
  - Optional: None.
- Request Body: Not used.
- Validation:
  - Define a Zod schema `paramsSchema = z.object({ id: z.string().uuid() })` for the dynamic segment.
  - Reject requests lacking an authenticated user (`locals.supabase` session) before hitting the database.
  - Ensure the wallet is active (`deleted_at IS NULL`) prior to updating to prevent duplicate deletions.

## 3. Response Details
- 200 OK success:
  - Response body should mirror the API spec: `{ "data": WalletDeletedDto }` where `WalletDeletedDto = { id: string; deleted_at: string; }`.
  - `deleted_at` should be populated with the ISO timestamp used for the update.
- Error responses:
  - 400 when param validation fails (malformed UUID).
  - 401 when the Supabase session is missing or invalid.
  - 403 when the wallet exists but is owned by another user (per spec).
  - 404 when the wallet cannot be found or is already soft-deleted.
  - 500 when Supabase/database operations throw unexpected errors.
- Align error payload shape with existing conventions (e.g., `{ error: { code, message } }`).

## 4. Data Flow
1. Astro route at `/api/wallets/[id].ts` receives the DELETE request; export `prerender = false` to keep the endpoint dynamic.
2. Extract the Supabase client from `locals.supabase` and resolve the authenticated user (`auth.getUser()` or shared helper). If none, return 401.
3. Parse and validate the `id` path parameter with the Zod schema; return 400 on failure.
4. Invoke a wallet service function `softDeleteWallet({ supabase, walletId, ownerId, now })` to isolate persistence logic.
5. Within the service:
   - Select the target wallet (`id`, `owner_id`, `deleted_at`) to confirm ownership and active status.
   - Throw typed errors for not found (404) or forbidden (403) cases.
   - Execute an update setting `deleted_at` to the provided `now` timestamp with filters on `id`, `owner_id`, and `deleted_at IS NULL`, returning the updated row (`select().single()`).
6. PostgreSQL trigger `cascade_soft_delete_instruments` automatically marks related instruments as deleted using the same timestamp.
7. Map the update result to `WalletDeletedDto` and shape the HTTP response as `{ data: dto }` with status 200.
8. Catch errors, translate typed errors to HTTP statuses, and log unexpected failures with contextual metadata.

## 5. Security Considerations
- Enforce authentication via Supabase; never operate on wallets without a verified user ID.
- Authorize strictly by checking `owner_id` during the select/update operations; never trust client-provided owner data.
- Avoid leaking resource existence by keeping error messages generic even when returning 403/404 per spec.
- Validate UUID input early to prevent malformed queries and potential injection.
- If global rate-limiting or abuse protection exists, ensure the endpoint is registered; otherwise plan for future middleware support.

## 6. Error Handling
- Map Zod validation errors to 400 with a short explanation (`invalid_id`).
- Missing or invalid session/token → 401 with `unauthorized` code.
- Ownership mismatch → 403 with `forbidden` code and logged attempt.
- Wallet absent or already soft-deleted → 404 with `wallet_not_found` code.
- Database or trigger failures → 500; log stack trace and request context. No dedicated error table exists yet, so use the centralized logger or `console.error` as an interim solution.
- Wrap Supabase errors in domain-specific errors to simplify response mapping.

## 7. Performance Considerations
- Use a single Supabase update call with `return=representation` to avoid an extra round trip after validation.
- Ensure queries filter by both `owner_id` and `deleted_at` to take advantage of `idx_wallets_owner_deleted`.
- Rely on database triggers to handle instrument updates instead of additional API calls.
- Reuse a shared ISO timestamp (`const now = new Date().toISOString()`) across wallet and cascading updates for consistency.
- Monitor latency via existing observability tooling once available; delete is a light write operation.

## 8. Implementation Steps
1. Create or extend `src/pages/api/wallets/[id].ts` to include a DELETE handler and export `prerender = false` if not present.
2. Add path parameter schema using Zod and ensure the handler pulls the Supabase client from `locals`.
3. Implement `softDeleteWallet` service in `src/lib/services/wallets.ts` (introduce the services directory if absent) along with supporting types like `SoftDeleteWalletParams` and domain error classes.
4. In the route handler, call the service, transform the result into `{ data: dto }`, and return 200.
5. Catch service errors, convert them to HTTP responses per the mapping in Section 6, and log unexpected failures via the agreed logging utility.
6. Write automated tests (unit or integration) validating success, 403, 404, and Supabase failure scenarios using a mocked Supabase client.
7. Update API documentation/release notes if maintained separately to reflect the availability of the DELETE endpoint.
8. Perform manual verification with an authenticated request to confirm wallet and instrument soft-delete behaviour and response payload accuracy.

