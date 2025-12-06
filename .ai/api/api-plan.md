# REST API Plan - Financial Wallets

## 1. Overview

This REST API provides endpoints for managing financial wallets and instruments with goal-tracking capabilities. The API is built on Astro API routes with Supabase backend and follows RESTful principles with JSON payloads.

**Base URL**: `/api`

**Authentication**: All endpoints require Supabase authentication via `Authorization: Bearer <token>` header.

**Currency Format**: All monetary values are accepted as PLN decimals (e.g., `123.45`) in requests and returned as both grosze integers and PLN decimals in responses. Internally, values are stored as grosze (1 PLN = 100 grosze).

## 2. Resources

| Resource | Database Table | Description |
|----------|----------------|-------------|
| Wallets | `wallets` | User-owned financial wallet containers |
| Instruments | `instruments` | Financial instruments (Bonds, ETF, Stocks) within wallets |
| Value Changes | `instrument_value_changes` | Historical record of instrument value changes |

## 3. Endpoints

### 3.1 Wallets

#### 3.1.1 List Wallets

**Endpoint**: `GET /api/wallets`

**Description**: Retrieves all active (non-soft-deleted) wallets owned by the authenticated user with computed aggregates for dashboard display.

**Query Parameters**:
- `sort` (optional): Sort field. Values: `name`, `updated_at` (default), `created_at`
- `order` (optional): Sort order. Values: `asc`, `desc` (default)

**Request Headers**:
```
Authorization: Bearer <supabase_auth_token>
```

**Response** (200 OK):
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Retirement Fund",
      "description": "Long-term savings for retirement",
      "created_at": "2025-11-01T10:00:00Z",
      "updated_at": "2025-11-03T14:30:00Z",
      "aggregates": {
        "target_grosze": 500000,
        "target_pln": "5000.00",
        "current_value_grosze": 325000,
        "current_value_pln": "3250.00",
        "invested_sum_grosze": 300000,
        "invested_sum_pln": "3000.00",
        "progress_percent": 65.0,
        "performance_percent": 8.33
      }
    }
  ]
}
```

**Error Responses**:
- `401 Unauthorized`: Missing or invalid authentication token
- `500 Internal Server Error`: Server error

---

#### 3.1.2 Get Wallet Detail

**Endpoint**: `GET /api/wallets/:id`

**Description**: Retrieves a single wallet with its instruments and computed aggregates.

**Path Parameters**:
- `id`: Wallet UUID

**Request Headers**:
```
Authorization: Bearer <supabase_auth_token>
```

**Response** (200 OK):
```json
{
  "data": {
    "id": "uuid",
    "name": "Retirement Fund",
    "description": "Long-term savings for retirement",
    "created_at": "2025-11-01T10:00:00Z",
    "updated_at": "2025-11-03T14:30:00Z",
    "aggregates": {
      "target_grosze": 500000,
      "target_pln": "5000.00",
      "current_value_grosze": 325000,
      "current_value_pln": "3250.00",
      "invested_sum_grosze": 300000,
      "invested_sum_pln": "3000.00",
      "progress_percent": 65.0,
      "performance_percent": 8.33
    },
    "instruments": [
      {
        "id": "uuid",
        "type": "ETF",
        "name": "S&P 500 ETF",
        "short_description": "Diversified US equity exposure",
        "invested_money_grosze": 150000,
        "invested_money_pln": "1500.00",
        "current_value_grosze": 162500,
        "current_value_pln": "1625.00",
        "goal_grosze": 250000,
        "goal_pln": "2500.00",
        "created_at": "2025-11-01T10:15:00Z",
        "updated_at": "2025-11-03T14:30:00Z"
      }
    ]
  }
}
```

**Error Responses**:
- `401 Unauthorized`: Missing or invalid authentication token
- `403 Forbidden`: Wallet does not belong to authenticated user
- `404 Not Found`: Wallet not found or soft-deleted
- `500 Internal Server Error`: Server error

---

#### 3.1.3 Create Wallet

**Endpoint**: `POST /api/wallets`

**Description**: Creates a new wallet for the authenticated user.

**Request Headers**:
```
Authorization: Bearer <supabase_auth_token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "name": "Emergency Fund",
  "description": "6 months of expenses" // optional
}
```

**Validation Rules**:
- `name`: Required, 1-100 characters, must be unique per user (case-insensitive) among active wallets
- `description`: Optional, max 500 characters

**Response** (201 Created):
```json
{
  "data": {
    "id": "uuid",
    "name": "Emergency Fund",
    "description": "6 months of expenses",
    "created_at": "2025-11-03T15:00:00Z",
    "updated_at": "2025-11-03T15:00:00Z",
    "aggregates": {
      "target_grosze": 0,
      "target_pln": "0.00",
      "current_value_grosze": 0,
      "current_value_pln": "0.00",
      "invested_sum_grosze": 0,
      "invested_sum_pln": "0.00",
      "progress_percent": 0,
      "performance_percent": 0
    }
  }
}
```

**Error Responses**:
- `400 Bad Request`: Validation errors
  ```json
  {
    "error": {
      "code": "VALIDATION_ERROR",
      "message": "Validation failed",
      "details": [
        {
          "field": "name",
          "message": "Name must be between 1 and 100 characters"
        }
      ]
    }
  }
  ```
- `401 Unauthorized`: Missing or invalid authentication token
- `409 Conflict`: Wallet name already exists for user
  ```json
  {
    "error": {
      "code": "DUPLICATE_NAME",
      "message": "A wallet with this name already exists"
    }
  }
  ```
- `500 Internal Server Error`: Server error

---

#### 3.1.4 Update Wallet

**Endpoint**: `PATCH /api/wallets/:id`

**Description**: Updates wallet name and/or description. Partial updates are supported.

**Path Parameters**:
- `id`: Wallet UUID

**Request Headers**:
```
Authorization: Bearer <supabase_auth_token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "name": "Updated Name", // optional
  "description": "Updated description" // optional
}
```

**Validation Rules**:
- Same as create endpoint for provided fields

**Response** (200 OK):
```json
{
  "data": {
    "id": "uuid",
    "name": "Updated Name",
    "description": "Updated description",
    "created_at": "2025-11-01T10:00:00Z",
    "updated_at": "2025-11-03T15:30:00Z"
  }
}
```

**Error Responses**:
- `400 Bad Request`: Validation errors
- `401 Unauthorized`: Missing or invalid authentication token
- `403 Forbidden`: Wallet does not belong to authenticated user
- `404 Not Found`: Wallet not found or soft-deleted
- `409 Conflict`: Name already exists for user
- `500 Internal Server Error`: Server error

---

#### 3.1.5 Soft-Delete Wallet

**Endpoint**: `DELETE /api/wallets/:id`

**Description**: Soft-deletes a wallet and cascades soft-delete to all its instruments. The wallet and instruments remain in the database but are excluded from queries.

**Path Parameters**:
- `id`: Wallet UUID

**Request Headers**:
```
Authorization: Bearer <supabase_auth_token>
```

**Response** (200 OK):
```json
{
  "data": {
    "id": "uuid",
    "deleted_at": "2025-11-03T16:00:00Z"
  }
}
```

**Error Responses**:
- `401 Unauthorized`: Missing or invalid authentication token
- `403 Forbidden`: Wallet does not belong to authenticated user
- `404 Not Found`: Wallet not found or already soft-deleted
- `500 Internal Server Error`: Server error

---

### 3.2 Instruments

#### 3.2.1 List Instruments in Wallet

**Endpoint**: `GET /api/wallets/:walletId/instruments`

**Description**: Retrieves all active instruments in a specific wallet.

**Path Parameters**:
- `walletId`: Wallet UUID

**Query Parameters**:
- `sort` (optional): Sort field. Values: `name`, `updated_at` (default), `type`, `current_value_grosze`
- `order` (optional): Sort order. Values: `asc`, `desc` (default)

**Request Headers**:
```
Authorization: Bearer <supabase_auth_token>
```

**Response** (200 OK):
```json
{
  "data": [
    {
      "id": "uuid",
      "wallet_id": "uuid",
      "type": "Bonds",
      "name": "Treasury Bonds",
      "short_description": "Safe government bonds",
      "invested_money_grosze": 100000,
      "invested_money_pln": "1000.00",
      "current_value_grosze": 105000,
      "current_value_pln": "1050.00",
      "goal_grosze": 150000,
      "goal_pln": "1500.00",
      "created_at": "2025-11-01T10:30:00Z",
      "updated_at": "2025-11-02T09:15:00Z"
    }
  ]
}
```

**Error Responses**:
- `401 Unauthorized`: Missing or invalid authentication token
- `403 Forbidden`: Wallet does not belong to authenticated user
- `404 Not Found`: Wallet not found or soft-deleted
- `500 Internal Server Error`: Server error

---

#### 3.2.2 Get Instrument Detail

**Endpoint**: `GET /api/instruments/:id`

**Description**: Retrieves a single instrument by ID.

**Path Parameters**:
- `id`: Instrument UUID

**Request Headers**:
```
Authorization: Bearer <supabase_auth_token>
```

**Response** (200 OK):
```json
{
  "data": {
    "id": "uuid",
    "wallet_id": "uuid",
    "type": "ETF",
    "name": "S&P 500 ETF",
    "short_description": "Diversified US equity exposure",
    "invested_money_grosze": 150000,
    "invested_money_pln": "1500.00",
    "current_value_grosze": 162500,
    "current_value_pln": "1625.00",
    "goal_grosze": 250000,
    "goal_pln": "2500.00",
    "created_at": "2025-11-01T10:15:00Z",
    "updated_at": "2025-11-03T14:30:00Z"
  }
}
```

**Error Responses**:
- `401 Unauthorized`: Missing or invalid authentication token
- `403 Forbidden`: Instrument does not belong to authenticated user
- `404 Not Found`: Instrument not found or soft-deleted
- `500 Internal Server Error`: Server error

---

#### 3.2.3 Create Instrument

**Endpoint**: `POST /api/wallets/:walletId/instruments`

**Description**: Creates a new instrument in the specified wallet. The `owner_id` is automatically set from the parent wallet.

**Path Parameters**:
- `walletId`: Wallet UUID

**Request Headers**:
```
Authorization: Bearer <supabase_auth_token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "type": "Stocks",
  "name": "Apple Inc.",
  "short_description": "Technology company stock", // optional
  "invested_money_pln": "2500.50",
  "current_value_pln": "2750.25",
  "goal_pln": "5000.00" // optional
}
```

**Validation Rules**:
- `type`: Required, must be one of: `"Bonds"`, `"ETF"`, `"Stocks"`
- `name`: Required, 1-100 characters, must be unique per wallet (case-insensitive) among active instruments
- `short_description`: Optional, max 500 characters
- `invested_money_pln`: Required, must be >= 0, decimal string (e.g., "1234.56")
- `current_value_pln`: Required, must be >= 0, decimal string
- `goal_pln`: Optional, must be >= 0 if provided, decimal string

**Response** (201 Created):
```json
{
  "data": {
    "id": "uuid",
    "wallet_id": "uuid",
    "type": "Stocks",
    "name": "Apple Inc.",
    "short_description": "Technology company stock",
    "invested_money_grosze": 250050,
    "invested_money_pln": "2500.50",
    "current_value_grosze": 275025,
    "current_value_pln": "2750.25",
    "goal_grosze": 500000,
    "goal_pln": "5000.00",
    "created_at": "2025-11-03T17:00:00Z",
    "updated_at": "2025-11-03T17:00:00Z"
  }
}
```

**Error Responses**:
- `400 Bad Request`: Validation errors or wallet is soft-deleted
  ```json
  {
    "error": {
      "code": "VALIDATION_ERROR",
      "message": "Validation failed",
      "details": [
        {
          "field": "type",
          "message": "Type must be one of: Bonds, ETF, Stocks"
        }
      ]
    }
  }
  ```
- `401 Unauthorized`: Missing or invalid authentication token
- `403 Forbidden`: Wallet does not belong to authenticated user
- `404 Not Found`: Wallet not found
- `409 Conflict`: Instrument name already exists in wallet
- `500 Internal Server Error`: Server error

---

#### 3.2.4 Update Instrument

**Endpoint**: `PATCH /api/instruments/:id`

**Description**: Updates instrument fields. Partial updates are supported. When `current_value_pln` changes, a value change record is automatically created by database trigger.

**Path Parameters**:
- `id`: Instrument UUID

**Request Headers**:
```
Authorization: Bearer <supabase_auth_token>
Content-Type: application/json
```

**Request Body** (all fields optional):
```json
{
  "type": "ETF",
  "name": "Updated Name",
  "short_description": "Updated description",
  "invested_money_pln": "3000.00",
  "current_value_pln": "3250.75",
  "goal_pln": "6000.00"
}
```

**Validation Rules**:
- Same as create endpoint for provided fields
- `wallet_id` cannot be changed (automatically rejected by database trigger)

**Response** (200 OK):
```json
{
  "data": {
    "id": "uuid",
    "wallet_id": "uuid",
    "type": "ETF",
    "name": "Updated Name",
    "short_description": "Updated description",
    "invested_money_grosze": 300000,
    "invested_money_pln": "3000.00",
    "current_value_grosze": 325075,
    "current_value_pln": "3250.75",
    "goal_grosze": 600000,
    "goal_pln": "6000.00",
    "created_at": "2025-11-01T10:15:00Z",
    "updated_at": "2025-11-03T17:30:00Z"
  }
}
```

**Error Responses**:
- `400 Bad Request`: Validation errors or parent wallet is soft-deleted
- `401 Unauthorized`: Missing or invalid authentication token
- `403 Forbidden`: Instrument does not belong to authenticated user
- `404 Not Found`: Instrument not found or soft-deleted
- `409 Conflict`: Name already exists in wallet
- `500 Internal Server Error`: Server error

---

#### 3.2.5 Soft-Delete Instrument

**Endpoint**: `DELETE /api/instruments/:id`

**Description**: Soft-deletes an instrument. The instrument remains in the database but is excluded from queries and wallet aggregations.

**Path Parameters**:
- `id`: Instrument UUID

**Request Headers**:
```
Authorization: Bearer <supabase_auth_token>
```

**Response** (200 OK):
```json
{
  "data": {
    "id": "uuid",
    "deleted_at": "2025-11-03T18:00:00Z"
  }
}
```

**Error Responses**:
- `401 Unauthorized`: Missing or invalid authentication token
- `403 Forbidden`: Instrument does not belong to authenticated user
- `404 Not Found`: Instrument not found or already soft-deleted
- `500 Internal Server Error`: Server error

---

### 3.3 Instrument Value Changes

#### 3.3.1 Get Instrument Value Change History

**Endpoint**: `GET /api/instruments/:id/value-changes`

**Description**: Retrieves historical value changes for an instrument, ordered by most recent first. Delta and direction are computed from before/after values.

**Path Parameters**:
- `id`: Instrument UUID

**Request Headers**:
```
Authorization: Bearer <supabase_auth_token>
```

**Response** (200 OK):
```json
{
  "data": [
    {
      "id": "uuid",
      "instrument_id": "uuid",
      "before_value_grosze": 150000,
      "before_value_pln": "1500.00",
      "after_value_grosze": 162500,
      "after_value_pln": "1625.00",
      "delta_grosze": 12500,
      "delta_pln": "125.00",
      "direction": "increase",
      "created_at": "2025-11-03T14:30:00Z"
    },
    {
      "id": "uuid",
      "instrument_id": "uuid",
      "before_value_grosze": 155000,
      "before_value_pln": "1550.00",
      "after_value_grosze": 150000,
      "after_value_pln": "1500.00",
      "delta_grosze": -5000,
      "delta_pln": "-50.00",
      "direction": "decrease",
      "created_at": "2025-11-02T09:15:00Z"
    }
  ]
}
```

**Field Descriptions**:
- `direction`: One of `"increase"`, `"decrease"`, or `"unchanged"`
- `delta_grosze` / `delta_pln`: Computed as `after_value - before_value` (can be negative)

**Error Responses**:
- `401 Unauthorized`: Missing or invalid authentication token
- `403 Forbidden`: Instrument does not belong to authenticated user
- `404 Not Found`: Instrument not found or soft-deleted
- `500 Internal Server Error`: Server error

---

## 4. Authentication and Authorization

### 4.1 Authentication Mechanism

**Provider**: Supabase Auth

**Implementation**:
- Authentication is handled by Supabase on the client side
- All API endpoints require a valid Supabase session token
- Token is passed via `Authorization: Bearer <token>` header
- Astro middleware validates the token using `@supabase/ssr` package
- Invalid or missing tokens result in `401 Unauthorized` response

**Token Validation Flow**:
1. Client obtains token from Supabase Auth (sign-up/sign-in)
2. Client includes token in `Authorization` header for API requests
3. Astro middleware (`src/middleware/index.ts`) validates token with Supabase
4. Middleware extracts `user.id` and attaches to request context
5. API route handlers access authenticated user ID for authorization checks

### 4.2 Authorization Rules

**Resource Ownership Enforcement**:
- All wallets and instruments include an `owner_id` field referencing `auth.users.id`
- API handlers verify that the authenticated user's ID matches the resource's `owner_id`
- Unauthorized access attempts return `403 Forbidden`

**Wallet-Scoped Authorization**:
- When creating instruments, verify the parent wallet belongs to the user
- When updating/deleting instruments, verify via `instruments.owner_id`
- Database triggers ensure `owner_id` consistency (cannot be modified)

**Soft-Delete Considerations**:
- Soft-deleted resources return `404 Not Found` for regular operations

### 4.3 Session Management

- Sessions are managed entirely by Supabase
- Token refresh is handled client-side using Supabase client library
- Server-side API does not implement custom session storage
- Logout is performed via Supabase client, invalidating the token

---

## 5. Validation and Business Logic

### 5.1 Request Validation

All endpoints perform the following validation layers:

**Layer 1: Schema Validation**
- Validate request body structure and data types
- Ensure required fields are present
- Reject unknown fields (strict schema)

**Layer 2: Business Rule Validation**
- Apply length constraints from database schema
- Validate enum values (instrument types)
- Check numeric ranges (non-negative monetary values)
- Validate currency format and convert PLN to grosze

**Layer 3: Database Constraint Validation**
- Unique name checks (case-insensitive, scoped to owner/wallet, active records only)
- Foreign key existence checks
- Soft-delete status checks

---

## 6. Error Response Format

All error responses follow a consistent structure:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": [ // optional, for validation errors
      {
        "field": "field_name",
        "message": "Specific field error"
      }
    ]
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid authentication token |
| `FORBIDDEN` | 403 | User does not own the resource |
| `NOT_FOUND` | 404 | Resource not found or soft-deleted |
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `DUPLICATE_NAME` | 409 | Name already exists (uniqueness violation) |
| `SOFT_DELETED_PARENT` | 400 | Cannot operate on resource with soft-deleted parent |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

---

## 7. Response Headers

All API responses include standard headers:

```
Content-Type: application/json; charset=utf-8
X-Request-ID: <unique_request_id>
```

**Rate Limiting Headers** (if implemented):
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1730736000
```

---

## 8. Sorting and Filtering

### Sorting

List endpoints support sorting via query parameters:
- `sort`: Field name to sort by
- `order`: `asc` or `desc`

### Filtering

Filtering is implicitly applied:
- All queries exclude soft-deleted records (`deleted_at IS NULL`) by default
- All queries are scoped to the authenticated user's `owner_id`

---

## 9. API Design Principles

1. **RESTful Resource Naming**: Use plural nouns for collections (`/wallets`, `/instruments`)
2. **Nested Routes for Hierarchy**: Instruments creation uses `/wallets/:id/instruments` to enforce parent context
3. **Partial Updates**: Use `PATCH` for partial resource updates
4. **Soft-Delete Abstraction**: `DELETE` method performs soft-delete; implementation is hidden from API consumers
5. **Computed Fields**: Aggregates and calculations are computed server-side and included in responses
6. **Currency Dual Format**: Return both grosze (integer) and PLN (decimal string) for client convenience
7. **Consistent Error Format**: All errors use the same JSON structure with codes and messages
8. **Database-Driven Validation**: Leverage database constraints and triggers to enforce business rules
9. **Authorization at Every Layer**: Check ownership on every resource access

---

## 10. Implementation Notes

### Middleware Setup

**File**: `src/middleware/index.ts`

Responsibilities:
- Validate Supabase auth token from `Authorization` header
- Extract user ID and attach to request context
- Return 401 for missing/invalid tokens
- Allow CORS for development (configure for production)

### API Route Structure

**Pattern**: `src/pages/api/[resource]/[...path].ts`

Each route:
- Imports Supabase client (service role for database operations)
- Accesses authenticated user ID from middleware context
- Validates request body using schema validation library (e.g., Zod)
- Executes database queries with ownership filters
- Transforms grosze ↔ PLN using helper functions
- Returns consistent JSON responses

### Database Client

**Client**: Supabase client with service role key (server-side)

- RLS is not enabled in MVP; access control enforced in API handlers
- Use parameterized queries to prevent SQL injection
- Leverage database triggers for automatic behaviors (value history, cascade soft-delete, etc.)

### Type Safety

- Generate TypeScript types from database schema using Supabase CLI: `supabase gen types typescript`
- Use generated types for request/response payloads
- Validate runtime data with Zod schemas matching database constraints

---

**API Version**: 1.0  
**Last Updated**: 2025-11-03  
**Status**: Ready for implementation

