# API Endpoint Implementation Plan: POST /api/wallets

## 1. Endpoint Overview
- Create a new wallet owned by the authenticated Supabase user using Astro API routes.
- Enforce wallet name uniqueness per active wallet (case-insensitive) and respect soft-delete semantics.
- Return the persisted wallet metadata alongside zeroed aggregate metrics to align with client expectations.

## 2. Request Details
- **HTTP Method**: POST
- **URL**: `/api/wallets`
- **Headers**: `Authorization: Bearer <supabase_auth_token>` (required), `Content-Type: application/json`
- **Body Schema**:
  - Required: `name` (string, trimmed length 1-100)
  - Optional: `description` (string, trimmed length ≤500, nullable)
- **Validation**: Use a Zod schema that trims whitespace, rejects empty or over-length values, and safely handles missing JSON bodies by returning a `400 VALIDATION_ERROR` payload.

## 3. Response Details
- **201 Created**: Payload `{ data: WalletCreatedDto }` where `WalletCreatedDto` = persisted wallet fields (`id`, `name`, `description`, `created_at`, `updated_at`) plus `aggregates: WalletAggregatesDto` with all grosze totals set to `0` and PLN strings formatted as `"0.00"`.
- **DTOs Used**: `CreateWalletCommand` for input typing, `WalletCreatedDto` and `WalletAggregatesDto` for response typing, `WalletInsert`/`Wallet` for database interaction.
- **Error Shapes**: Follow shared error envelope `{ error: { code, message, details? } }` with codes `VALIDATION_ERROR`, `UNAUTHORIZED`, `DUPLICATE_NAME`, `SERVER_ERROR`.

## 4. Data Flow
1. Astro route `src/pages/api/wallets/index.ts` exports `POST` handler (and `export const prerender = false`).
2. Extract Supabase client from `context.locals.supabase`; read and validate the `Authorization` header, obtaining the session via `supabase.auth.getUser(token)`.
3. Parse JSON body, validate with the Zod schema into `CreateWalletCommand`, trimming inputs.
4. Delegate to a new service `src/lib/services/wallets/createWallet.ts` with `{ supabase, ownerId, payload }`.
5. Service checks for an existing active wallet (`deleted_at IS NULL`) with the same case-insensitive name using `eq("owner_id", ownerId)` and relying on `citext` for comparison; if found, return a domain `DuplicateWalletNameError`.
6. On success path, insert a new wallet row with `name`, `description ?? null`, `owner_id`, and rely on database defaults for timestamps. Use `select().single()` to fetch inserted metadata.
7. Map result to `WalletCreatedDto`, pairing with a helper `buildEmptyWalletAggregates()` that returns zeroed numeric/string pairs.
8. Route translates service response to HTTP 201 JSON; catches domain errors to map to 409/401/400 and logs unexpected exceptions before emitting 500.

## 5. Security Considerations
- **Authentication**: Fail fast if bearer token missing or `supabase.auth.getUser` returns error/null.
- **Authorization**: Scope all Supabase reads/inserts with the authenticated user’s `id`; never trust client-provided owner data.
- **Input Sanitization**: Trim strings, disallow control characters, and enforce length to mitigate injection or abuse.
- **Soft Delete Compliance**: Treat wallets with `deleted_at` as unavailable when checking duplicates, allowing recreation after deletion.
- **Secrets**: Reuse `context.locals.supabase`; do not instantiate clients with service-role keys inside the route.

## 6. Error Handling
- Map validation failures to `400 VALIDATION_ERROR` with field-level details from Zod issues.
- Return `401 UNAUTHORIZED` when auth token is absent/invalid.
- Translate duplicate-name domain error to `409 DUPLICATE_NAME` with a client-friendly message.
- Wrap Supabase/PostgREST failures, JSON parse errors, or unexpected exceptions in `500 SERVER_ERROR`.
- Log all error branches using a structured helper (create `logApiError` under `src/lib/services` or temporarily `console.error`) including request correlation data (userId, payload hash) to aid debugging.

## 7. Performance Considerations
- Duplicate check uses indexed columns (`owner_id`, `deleted_at`) aligning with `idx_wallets_owner_deleted` to stay efficient.
- Select only necessary columns in Supabase queries (`select("id,name,description,created_at,updated_at")`).
- Avoid extra round trips by performing duplicate check via `maybeSingle()` query rather than fetching lists.
- Keep helper computations (aggregates) synchronous and lightweight.

## 8. Implementation Steps
1. Add a Zod schema under `src/lib/validation/wallets.ts` (or similar) exporting `createWalletSchema` that produces `CreateWalletCommand`.
2. Introduce a utility `buildEmptyWalletAggregates` (e.g., `src/lib/services/wallets/aggregates.ts`) returning zeroed `WalletAggregatesDto` values with both grosze integers and PLN strings; reuse elsewhere.
3. Implement `createWallet.ts` service encapsulating duplicate check, insert, DTO mapping, and domain-specific error classes (`DuplicateWalletNameError`).
4. Scaffold API route `src/pages/api/wallets/index.ts` implementing the POST handler, integrating validation, auth retrieval, service invocation, and standard JSON response helpers; export `prerender = false`.
5. Add shared response/error helpers if absent (e.g., `jsonResponse`, `errorResponse`, `logApiError`) to keep the route concise and reusable.
6. Write unit tests for the service (duplicate detection, successful insert mapping) using mocked Supabase client; add an integration test for the route if testing infrastructure exists.
7. Update API documentation/changelog if required and run lint/test suites to confirm adherence to project standards.

