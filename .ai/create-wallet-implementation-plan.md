# API Endpoint Implementation Plan: Create Wallet

## 1. Endpoint Overview
Creates a new financial wallet for the authenticated user, optionally with an initial allocation of financial instruments. Enforces that the sum of instrument goal amounts equals the wallet’s goal amount.

## 2. Request Details
- HTTP Method: POST  
- URL Structure: `/api/wallets`  
- Authentication: Bearer JWT (handled by middleware)  

### Parameters
- Required:
  - `name` (string): non-empty.
  - `goal_amount` (integer): ≥ 0, in smallest currency unit.
  - `target_date` (string, ISO): must be in the future.
- Optional:
  - `description` (string).
  - `instruments` (array of objects). If provided, each object must include:
    - `type` (`"Bonds" | "ETF" | "Stocks"`)
    - `goal_amount` (integer ≥ 0)
    - `current_value` (integer ≥ 0)
    - `growth_percentage` (float)
    - `name` (string, optional)

### Request Body Schema (Zod)
```ts
const InstrumentSchema = z.object({
  type: z.enum(["Bonds","ETF","Stocks"]),
  name: z.string().optional(),
  goal_amount: z.number().int().nonnegative(),
  current_value: z.number().int().nonnegative(),
  growth_percentage: z.number(),
});
const CreateWalletSchema = z.object({
  name: z.string().min(1),
  goal_amount: z.number().int().nonnegative(),
  target_date: z.string().refine(d => new Date(d) > new Date(), "Must be future date"),
  description: z.string().optional(),
  instruments: z.array(InstrumentSchema).optional(),
});
```

## 3. Used Types
- **Command Models**  
  - `CreateWalletCommand`  
  - `CreateInstrumentCommand`  
- **Response DTOs**  
  - `WalletWithInstrumentsDto`  
  - `InstrumentDto`  

## 4. Response Details
- **Success** (201 Created)  
  ```json
  {
    "id": "uuid",
    "name": "...",
    "goal_amount": 8000000,
    "target_date": "2028-01-01T00:00:00Z",
    "description": "...",
    "instruments": [
      {
        "id": "uuid",
        "wallet_id": "uuid",
        "type": "Bonds",
        "name": "Gov Bonds",
        "goal_amount": 2000000,
        "current_value": 0,
        "growth_percentage": 0
      },
      …
    ]
  }
  ```
- **Errors**  
  - `400 Bad Request`: validation/Zod parsing errors  
  - `401 Unauthorized`: missing/invalid JWT  
  - `422 Unprocessable Entity`: sum(instruments.goal_amount) ≠ wallet.goal_amount  
  - `500 Internal Server Error`: database or transaction failure  

## 5. Data Flow
1. **Middleware** extracts `supabase` and `user.id` from JWT into `context.locals`.
2. **API Route Handler** (`src/pages/api/wallets.ts`):
   - Parse & validate JSON body against `CreateWalletSchema`.
   - Compute sum of instrument goals and compare to `payload.goal_amount`.
3. **Service Layer** (`src/lib/services/walletService.ts`):
   - `createWallet(command, userId)`:
     1. Begin Supabase transaction.
     2. Insert into `wallets` (with `user_id`).
     3. For each instrument:
        - Insert into `financial_instruments`.
        - Insert an initial row in `financial_instrument_operations` with `amount = current_value`.
     4. Commit transaction.
     5. Fetch and assemble `InstrumentDto[]`, computing `current_value` and `growth_percentage`.
   - Return `WalletWithInstrumentsDto`.
4. **API Handler** returns the DTO with HTTP 201.

## 6. Security Considerations
- **Authentication**: enforce JWT via middleware.
- **Authorization (RLS)**: Supabase RLS policies ensure users only touch their own `wallets` and related tables.
- **Input Validation**: Zod prevents malformed data.
- **SQL Injection**: using Supabase client parameterized methods.
- **Error Exposure**: don’t leak stack traces; return generic messages on 500.

## 7. Error Handling
- **400**: invalid JSON or Zod schema violations.
- **401**: unauthenticated requests.
- **422**: business rule violation (instrument sums mismatch).
- **500**: catch-all for unexpected exceptions; log server-side.

## 8. Performance Considerations
- Use a single database transaction for multi-row operations.
- Batch insert operations where possible.
- Indexes already exist on `user_id`, `wallet_id`, `instrument_id`.
- Payload size: limit array length or goal values reasonably via schema refinements if needed.

## 9. Implementation Steps
1. Create `src/lib/services/walletService.ts`, define `createWallet(command, userId)` as above.
2. In `src/pages/api/wallets.ts`, add `export const POST: APIRoute`:
   - Import Zod schemas and `walletService`.
   - Validate body, handle error codes.
   - Call `walletService.createWallet(payload, userId)`.
   - Return `json(result, { status: 201 })`.
3. Define RLS policies in Supabase migration (if not already):
   - Allow insert on `wallets` where `auth.uid() = user_id`.
   - Allow insert on `financial_instruments`/`operations` where parent wallet/instrument belongs to user.
4. Add Zod schemas to a shared file (e.g. `src/lib/validation/wallet.ts`).
5. Write unit tests for:
   - Successful creation (no instruments).
   - Creation with valid instruments.
   - Validation failures (bad date, negative numbers).
   - Sum mismatch → 422.
6. Update API documentation (README or Swagger).
7. Review linter/formatting; run CI.
8. Review final migration, service, handler; merge code.
