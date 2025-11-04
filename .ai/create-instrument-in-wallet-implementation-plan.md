# API Endpoint Implementation Plan: POST /api/wallets/:walletId/instruments

## 1. Endpoint Overview
- Provision a new instrument inside an existing wallet owned by the authenticated user.
- Enforce wallet soft-delete rules and per-wallet case-insensitive instrument name uniqueness before persisting.
- Store monetary amounts as grosze integers while exposing both grosze and formatted PLN strings in the response DTO.

## 2. Request Details
- HTTP Method: POST
- URL Structure: `/api/wallets/:walletId/instruments`
- Headers:
  - `Authorization: Bearer <supabase_auth_token>` (required)
  - `Content-Type: application/json` (required)
- Path Parameters:
  - `walletId` (UUID, required) — validated upfront; reject malformed IDs.
- Request Body (`CreateInstrumentCommand`):
  - `type` (required) — enum `InstrumentType` limited to `Bonds | ETF | Stocks`.
  - `name` (required) — trimmed string length 1–100, case-insensitive uniqueness within wallet, disallow control characters.
  - `short_description` (optional) — trimmed string ≤500; treat empty string as `null`.
  - `invested_money_pln` (required) — decimal string with max two fraction digits, ≥0.00.
  - `current_value_pln` (required) — same decimal rules as invested.
  - `goal_pln` (optional) — decimal string ≥0.00; absence → `null`.
- Validation Strategy:
  - Use a strict Zod schema in `src/lib/validation/instruments.ts` to coerce/trim strings, guard decimal format (`/^[0-9]+(\.[0-9]{1,2})?$/`), and produce field-level errors.
  - Reject payloads missing required keys, containing unknown keys (use `.strict()`), or with negative values.
  - Convert optional `short_description` empty string to `undefined` before persistence.

## 3. Response Details
- Success 201: `{ data: InstrumentCreatedDto }` mirroring inserted row with dual-format monetary fields (`*_grosze` ints + `*_pln` strings).
- Error Codes:
  - 400 `VALIDATION_ERROR` for schema failures or soft-deleted wallet attempts.
  - 401 `UNAUTHORIZED` when session lookup fails.
  - 403 `FORBIDDEN` when wallet exists but belongs to another user.
  - 404 `NOT_FOUND` when wallet does not exist.
  - 409 `CONFLICT` when instrument name already exists among active wallet instruments.
  - 500 `SERVER_ERROR` for unhandled Supabase issues.
- Types Consumed/Produced: `CreateInstrumentCommand`, `InstrumentCreatedDto`, `InstrumentType`, and `InstrumentInsert`/`Instrument` for DB mapping.

## 4. Data Flow
1. API Route: Create `src/pages/api/wallets/[walletId]/instruments.ts` exporting `prerender = false` and a `POST` handler.
2. Auth: Retrieve Supabase client from `context.locals.supabase`; require bearer token and call `supabase.auth.getUser()` (or existing helper) to get `user.id`. Respond 401 on failure.
3. Inputs: Parse `walletId` with a UUID helper (add `parseUuid` if absent) and validate JSON body via `createInstrumentSchema.safeParseAsync`.
4. Wallet Guard: Call Supabase `from('wallets')` filtered by `id = walletId` selecting `owner_id, deleted_at`. Map outcomes:
   - missing → `WalletNotFoundError`.
   - `deleted_at` not null → `WalletSoftDeletedError`.
   - owner mismatch → `WalletForbiddenError`.
5. Duplicate Guard: Query `instruments` with `wallet_id = walletId`, `deleted_at IS NULL`, and `name = name` (citext ensures case-insensitivity). If row exists, emit `InstrumentNameConflictError`.
6. Transform: Use currency helper (e.g., `toGrosze` & `toPlnString`) to convert validated strings into integers and vice versa.
7. Persist: Insert into `instruments` with `wallet_id`, converted grosze values, `goal_grosze` (nullable), `short_description` (nullable). Use `select("id,wallet_id,type,name,short_description,invested_money_grosze,current_value_grosze,goal_grosze,created_at,updated_at")` and `single()` to return inserted row; rely on trigger to set `owner_id`.
8. DTO Mapping: Wrap DB row using helper `mapInstrumentToDto` that adds PLN string fields (`*_pln`), using the currency formatter to avoid floating arithmetic.
9. Response: Route converts service result into JSON `{ data: dto }` with HTTP 201. On domain errors, map to appropriate status and structured error payload. Log unexpected errors before sending 500.

## 5. Security Considerations
- Authentication: Strictly require valid Supabase session; never trust client-provided owner IDs.
- Authorization: Scope wallet lookup and instrument insert to `owner_id = user.id`; return 403 when wallet belongs to someone else to match spec.
- Soft-delete Enforcement: Prevent inserts into wallets with `deleted_at` set even though DB trigger also blocks; doing so allows controlled 400 messaging.
- Input Hardening: Trim strings, reject control characters, enforce max lengths to mitigate injection attempts and database constraint violations.
- Error Logging: Use centralized logger (or `console.error` placeholder) with correlation IDs/user IDs; since no error table exists, ensure logs exclude sensitive tokens.
- Rate/Replay Awareness: Mention idempotency expectations (client may retry); service should be safe because duplicate detection prevents double creation.

## 6. Error Handling
- Map Zod issues into `{ error: { code: "VALIDATION_ERROR", message, details[] } }` with per-field messages.
- Domain errors (`WalletNotFound`, `WalletForbidden`, `WalletSoftDeleted`, `InstrumentNameConflict`) surfaced from service; route translates to 404/403/400/409.
- Convert Supabase SQLSTATE `23505` (unique violation) to `InstrumentNameConflictError` in service if pre-check missed.
- Wrap unexpected Supabase/network errors in `InternalServerError`, log stack, respond 500 with generic message.
- For malformed JSON, catch parsing exceptions and respond 400 before validation.

## 7. Performance Considerations
- Wallet lookup and duplicate check use indexed columns (`idx_wallets_owner_deleted`, `idx_instruments_wallet_deleted`), ensuring constant-time filters.
- Limit `select` columns to those needed for response; avoid fetching large text fields unnecessarily.
- Perform duplicate check before insert to fail fast and avoid handling Postgres exceptions, while still translating unique constraint errors defensively.
- Consider batching operations by reusing existing Supabase client; avoid multiple auth calls per request.

## 8. Implementation Steps
1. **Validation Schema:** Add `createInstrumentSchema` (and helpers like `decimalStringSchema`) under `src/lib/validation/instruments.ts`, returning `CreateInstrumentCommand`.
2. **Currency Helpers:** Create `src/lib/formatters/currency.ts` (or similar) exporting `parsePlnToGrosze(value: string): number` and `formatGroszeToPln(value: number): string` with validation + unit tests.
3. **Domain Errors:** Introduce reusable error classes/enums in `src/lib/errors/instruments.ts` (e.g., `InstrumentNameConflictError`) or extend existing error module.
4. **Service Layer:** Implement `src/lib/services/instruments/createInstrument.ts` encapsulating wallet guard, duplicate guard, currency conversions, insertion, and DTO mapping.
5. **DTO Mapper:** Add helper `mapInstrumentToDto` (possibly in `src/lib/services/instruments/mappers.ts`) to enrich DB rows with PLN strings using currency formatter.
6. **API Route:** Create `src/pages/api/wallets/[walletId]/instruments.ts` defining `export const prerender = false` and `export async function POST(context)` that orchestrates auth, validation, service invocation, and response/error mapping.
7. **Logging Helper:** If not present, add `logApiError` in `src/lib/observability/logging.ts` and call it from the route on non-expected failures.
8. **Testing:** Write unit tests for converters and service (success, duplicate, wallet not found/forbidden, soft-deleted) with mocked Supabase; add integration test stubs if automated API testing exists.
9. **Documentation & QA:** Update `.ai/api-plan.md` or developer docs if needed, run project lint/test commands, and coordinate with frontend to align on payload/response.

