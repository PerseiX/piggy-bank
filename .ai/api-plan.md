# REST API Plan

## 1. Resources

- **Wallets**: Represents a user's financial wallet. Corresponds to the `wallets` table.
- **Financial Instruments**: Represents a financial instrument within a wallet. Corresponds to the `financial_instruments` table.

## 2. Endpoints

### Wallets

#### List Wallets

- **HTTP Method**: `GET`
- **URL Path**: `/api/wallets`
- **Description**: Retrieves a list of all wallets for the authenticated user, including calculated summary data for dashboard display.
- **Query Parameters**:
    - `sortBy` (optional, string): Field to sort by (e.g., `name`, `target_date`). Default: `target_date`.
    - `order` (optional, string): Sort order (`asc` or `desc`). Default: `asc`.
- **JSON Response Payload**:
  ```json
  [
    {
      "id": "uuid",
      "name": "Retirement Fund",
      "goal_amount": 50000000,
      "target_date": "2050-12-31T23:59:59Z",
      "description": "Long term savings for retirement.",
      "summary": {
        "current_total": 1500000,
        "remaining_amount": 48500000,
        "days_left": 9200
      },
      "instruments": [
        {
          "id": "uuid",
          "wallet_id": "uuid",
          "type": "ETF",
          "name": "S&P 500 ETF",
          "goal_amount": 30000000,
          "current_value": 1000000,
          "growth_percentage": 8.5
        }
      ]
    }
  ]
  ```
- **Success Codes**: `200 OK`
- **Error Codes**: `401 Unauthorized`

#### Create Wallet

- **HTTP Method**: `POST`
- **URL Path**: `/api/wallets`
- **Description**: Creates a new financial wallet. Instruments can be included to define goal allocations.
- **JSON Request Payload**:
  ```json
  {
    "name": "New Car Fund",
    "goal_amount": 8000000,
    "target_date": "2028-01-01T00:00:00Z",
    "description": "Savings for a new car.",
    "instruments": [
      {
        "type": "Bonds",
        "name": "Gov Bonds",
        "goal_amount": 2000000,
        "current_value": 0,
        "growth_percentage": 0
      },
      {
        "type": "Stocks",
        "name": "Tech Stocks",
        "goal_amount": 6000000,
        "current_value": 0,
        "growth_percentage": 0
      }
    ]
  }
  ```
- **JSON Response Payload**:
  ```json
  {
    "id": "uuid",
    "name": "New Car Fund",
    "goal_amount": 8000000,
    "target_date": "2028-01-01T00:00:00Z",
    "description": "Savings for a new car.",
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
        {
          "id": "uuid",
          "wallet_id": "uuid",
          "type": "Stocks",
          "name": "Tech Stocks",
          "goal_amount": 6000000,
          "current_value": 0,
          "growth_percentage": 0
        }
    ]
  }
  ```
- **Success Codes**: `201 Created`
- **Error Codes**: `400 Bad Request`, `401 Unauthorized`, `422 Unprocessable Entity`

#### Get Wallet Details

- **HTTP Method**: `GET`
- **URL Path**: `/api/wallets/{walletId}`
- **Description**: Retrieves detailed information for a single wallet, including its instruments and summary calculations.
- **JSON Response Payload**:
  ```json
  {
    "id": "uuid",
    "name": "Retirement Fund",
    "goal_amount": 50000000,
    "target_date": "2050-12-31T23:59:59Z",
    "description": "Long term savings for retirement.",
    "summary": {
      "current_total": 1500000,
      "remaining_amount": 48500000,
      "days_left": 9200
    },
    "instruments": [
      {
        "id": "uuid",
        "wallet_id": "uuid",
        "type": "ETF",
        "name": "S&P 500 ETF",
        "goal_amount": 30000000,
        "current_value": 1000000,
        "growth_percentage": 8.5
      }
    ]
  }
  ```
- **Success Codes**: `200 OK`
- **Error Codes**: `401 Unauthorized`, `404 Not Found`

#### Update Wallet

- **HTTP Method**: `PUT`
- **URL Path**: `/api/wallets/{walletId}`
- **Description**: Updates the details of an existing wallet.
- **JSON Request Payload**:
  ```json
  {
    "name": "Updated Car Fund",
    "goal_amount": 8500000,
    "target_date": "2028-06-01T00:00:00Z",
    "description": "Updated savings for a new car."
  }
  ```
- **JSON Response Payload**:
  ```json
  {
    "id": "uuid",
    "name": "Updated Car Fund",
    "goal_amount": 8500000,
    "target_date": "2028-06-01T00:00:00Z",
    "description": "Updated savings for a new car."
  }
  ```
- **Success Codes**: `200 OK`
- **Error Codes**: `400 Bad Request`, `401 Unauthorized`, `404 Not Found`, `422 Unprocessable Entity`

#### Delete Wallet

- **HTTP Method**: `DELETE`
- **URL Path**: `/api/wallets/{walletId}`
- **Description**: Deletes a wallet and all of its associated financial instruments.
- **JSON Response Payload**: `(No content)`
- **Success Codes**: `204 No Content`
- **Error Codes**: `401 Unauthorized`, `404 Not Found`

---

### Financial Instruments

*Note: Financial instruments are managed as a nested resource under wallets.*

#### List Instruments for a Wallet

- **HTTP Method**: `GET`
- **URL Path**: `/api/wallets/{walletId}/instruments`
- **Description**: Retrieves a list of all financial instruments within a specific wallet.
- **JSON Response Payload**:
  ```json
  [
    {
      "id": "uuid",
      "wallet_id": "uuid",
      "type": "ETF",
      "name": "S&P 500 ETF",
      "goal_amount": 30000000,
      "current_value": 1000000,
      "growth_percentage": 8.5
    }
  ]
  ```
- **Success Codes**: `200 OK`
- **Error Codes**: `401 Unauthorized`, `404 Not Found` (if wallet does not exist)

#### Add Instrument to Wallet

- **HTTP Method**: `POST`
- **URL Path**: `/api/wallets/{walletId}/instruments`
- **Description**: Adds a new financial instrument to a specified wallet.
- **JSON Request Payload**:
  ```json
  {
    "type": "Stocks",
    "name": "Individual Tech Stock",
    "goal_amount": 5000000,
    "current_value": 250000,
    "growth_percentage": 12.0
  }
  ```
- **JSON Response Payload**:
  ```json
  {
    "id": "uuid",
    "wallet_id": "uuid",
    "type": "Stocks",
    "name": "Individual Tech Stock",
    "goal_amount": 5000000,
    "current_value": 250000,
    "growth_percentage": 12.0
  }
  ```
- **Success Codes**: `201 Created`
- **Error Codes**: `400 Bad Request`, `401 Unauthorized`, `404 Not Found`, `422 Unprocessable Entity`

#### Update Instrument

- **HTTP Method**: `PUT`
- **URL Path**: `/api/wallets/{walletId}/instruments/{instrumentId}`
- **Description**: Updates the details of a specific financial instrument, typically its current value and growth.
- **JSON Request Payload**:
  ```json
  {
    "type": "Stocks",
    "name": "Individual Tech Stock (Updated)",
    "goal_amount": 5500000,
    "current_value": 280000,
    "growth_percentage": 13.5
  }
  ```
- **JSON Response Payload**:
  ```json
  {
    "id": "uuid",
    "wallet_id": "uuid",
    "type": "Stocks",
    "name": "Individual Tech Stock (Updated)",
    "goal_amount": 5500000,
    "current_value": 280000,
    "growth_percentage": 13.5
  }
  ```
- **Success Codes**: `200 OK`
- **Error Codes**: `400 Bad Request`, `401 Unauthorized`, `404 Not Found`, `422 Unprocessable Entity`

#### Delete Instrument

- **HTTP Method**: `DELETE`
- **URL Path**: `/api/wallets/{walletId}/instruments/{instrumentId}`
- **Description**: Removes a financial instrument from a wallet.
- **JSON Response Payload**: `(No content)`
- **Success Codes**: `204 No Content`
- **Error Codes**: `401 Unauthorized`, `404 Not Found`

## 3. Authentication and Authorization

- **Mechanism**: Authentication will be handled using JSON Web Tokens (JWT) provided by Supabase Auth.
- **Implementation**:
    1. The client application will use the Supabase client library to handle user registration and login.
    2. Upon successful login, Supabase provides a JWT.
    3. The client must include this JWT in the `Authorization` header for all subsequent API requests, using the `Bearer` scheme (e.g., `Authorization: Bearer <your-supabase-jwt>`).
    4. The Astro API endpoints will use a middleware to extract and validate the JWT. The middleware will also retrieve the associated user from Supabase.
    5. Authorization is enforced at the database level using PostgreSQL Row-Level Security (RLS) policies. All tables (`wallets`, `financial_instruments`) will have policies ensuring that users can only access or modify rows where the `user_id` matches their own authenticated user ID.

## 4. Validation and Business Logic

### Validation

- **Wallets**:
    - `name`: Required, non-empty string.
    - `goal_amount`: Required, must be a non-negative integer.
    - `target_date`: Required, must be a valid future date.
- **Financial Instruments**:
    - `type`: Required, must be one of the predefined `instrument_type` enum values ('Bonds', 'ETF', 'Stocks').
    - `goal_amount`: Required, must be a non-negative integer.
    - `current_value`: Required, must be a non-negative integer.
    - `growth_percentage`: Required, must be a number (can be negative).

### Business Logic

- **Goal Allocation**:
    - When creating a wallet, the sum of the `goal_amount` for all provided instruments must equal the wallet's `goal_amount`. If they do not match, the API will return a `422 Unprocessable Entity` error. This logic will be handled within the `POST /api/wallets` endpoint.
- **Summary Calculations**:
    - The API will perform calculations on the fly when wallet data is requested.
    - **Computed Instrument Value**: `computed_value = current_value`
    - **Wallet Current Total**: `current_total = SUM(computed_value)` for all instruments in the wallet.
    - **Remaining Amount**: `remaining_amount = MAX(0, goal_amount - current_total)`.
    - **Days Left**: `days_left = target_date - NOW()`.
    - These calculations are performed in the backend within the `GET /api/wallets` and `GET /api/wallets/{walletId}` endpoints to ensure the frontend always receives up-to-date, consistent data.
- **Data Integrity**:
    - Cascading deletes will be configured in the database. When a wallet is deleted via `DELETE /api/wallets/{walletId}`, the database will automatically delete all associated financial instruments, ensuring no orphan data.
