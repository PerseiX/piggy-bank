# API Endpoint Implementation Plan: GET /api/wallets

## 1. Endpoint Overview
Retrieves a list of all wallets belonging to the authenticated user, including each wallet’s summary and its associated financial instruments. This endpoint supports optional sorting by wallet name or target date.

## 2. Request Details
- HTTP Method: GET  
- URL Path: `/api/wallets`  
- Query Parameters:
  - Optional:
    - `sortBy`: `name` | `target_date` (default: `target_date`)
    - `order`: `asc` | `desc` (default: `asc`)
- Authentication: Must be authenticated via Supabase session. The user object is available on `context.locals.user` in Astro API routes.
- Request Body: None

## 3. Used Types
- **WalletDto** (`src/types.ts`): Represents the wallet with its summary and instruments.
- **WalletSummaryDto**: Contains `current_total`, `remaining_amount`, and `days_left` fields.
- **InstrumentDto**: Represents a financial instrument with `current_value` and `growth_percentage`.

## 4. Response Details
- **200 OK**: Returns JSON array of `WalletDto`.
- **400 Bad Request**: Invalid query parameters (e.g., unsupported `sortBy` or `order`).
- **401 Unauthorized**: Missing or invalid authentication.
- **500 Internal Server Error**: Unexpected errors (database failures, service exceptions).

Example payload:
```json
[
  {
    "id": "uuid",
    "name": "Retirement Fund",
    "goal_amount": 50000000,
    "target_date": "2050-12-31T23:59:59Z",
    "description": "Long term savings for retirement.",
    "summary": { "current_total": 1500000, "remaining_amount": 48500000, "days_left": 9200 },
    "instruments": [ /* InstrumentDto[] */ ]
  }
]
```

## 5. Data Flow
1. **Route Handler** (`src/pages/api/wallets.ts`): Export `GET` handler with `export const prerender = false`.
2. **Authentication**: Read `user` from `context.locals`; return 401 if missing.
3. **Parameter Validation**: Use Zod to parse and validate `sortBy` and `order`, providing defaults.
4. **Service Layer** (`src/lib/services/walletService.ts`): Implement `getWallets(userId: string, options: { sortBy: string; order: string; }): Promise<WalletDto[]>`:
   - Query `wallets` table with RLS via Supabase client.
   - Join or batch-fetch `financial_instruments` and their operations.
   - Compute `current_total` (sum of operations) and `days_left` (based on `target_date`).
   - Map raw records into `WalletDto` and `InstrumentDto` shapes.
5. **Response**: Return `Response.json(wallets, { status: 200 })`.

## 6. Security Considerations
- **Authentication & Authorization**: Rely on Supabase session and RLS policies to ensure users only see their own wallets.
- **Input Validation**: Zod schema prevents injection or invalid sort values.
- **Data Exposure**: Only return fields defined in DTOs; no internal or sensitive columns.
- **Rate Limiting**: (Optional) Consider adding rate limiting middleware for brute-force protection.

## 7. Error Handling
| Scenario                                | Status Code | Action                                                              |
|-----------------------------------------|-------------|---------------------------------------------------------------------|
| Unauthenticated                         | 401         | Return JSON `{ error: 'Unauthorized' }`                             |
| Invalid query parameters                | 400         | Return JSON with Zod validation errors                              |
| Supabase query error or service failure | 500         | Log error to console or centralized logger, return `{ error: 'Server error' }` |

## 8. Performance Considerations
- **Minimize Queries**: Use a single RPC or bulk SELECT with `supabase.from('wallets').select('*, financial_instruments(*, operations:financial_instrument_operations(amount))')` and compute aggregates server-side if possible.
- **Indexing**: Ensure `wallets.user_id`, `financial_instruments.wallet_id`, and `financial_instrument_operations.instrument_id` are indexed.
- **Pagination**: (Future) For large data sets, add pagination parameters (limit, offset).

## 9. Implementation Steps
1. **Define Zod schema** for `sortBy` and `order` in `src/pages/api/wallets.ts`.
2. **Create service file** `src/lib/services/walletService.ts`:
   - Export `getWallets(userId, { sortBy, order })`.
   - Implement Supabase queries, aggregations, and mapping to DTOs.
3. **Add API route** file `src/pages/api/wallets.ts`:
   - Set `export const prerender = false` and `export const GET` handler.
   - Validate session, parse params, call service, handle errors.
4. **Import DTO types** from `src/types.ts` and ensure type safety.
5. **Add or update RLS policies** in Supabase if not already configured:
   - Ensure `wallets`, `financial_instruments`, and `financial_instrument_operations` tables allow only authenticated users to select their own data.
6. **Write tests**:
   - Unit tests for `getWallets` logic (mock Supabase client).
   - Integration tests for the API route (using Supertest or similar).
7. **Documentation**:
   - Update `README.md` or API docs with endpoint spec, parameter descriptions, and sample responses.
8. **Lint & Format**:
   - Run `npm run lint` and `npm run format` to ensure code quality.
