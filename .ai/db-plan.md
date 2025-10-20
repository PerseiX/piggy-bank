### Plan for Database Schema Creation

1.  **Define Custom Data Types**
    *   Create a PostgreSQL `ENUM` named `instrument_type` to enforce that financial instruments can only be one of the predefined types: 'Bonds', 'ETF', or 'Stocks'.

2.  **Create the `wallets` Table**
    *   **Purpose**: To store wallet information, including its name, financial goal, and target date.
    *   **Columns**:
        *   `id`: `UUID`, Primary Key.
        *   `user_id`: `UUID`, Foreign Key referencing `auth.users(id)`. Ensures each wallet is tied to a Supabase user.
        *   `name`: `TEXT`, for the wallet's name.
        *   `goal_amount`: `BIGINT`, representing the goal in the smallest currency unit (grosze).
        *   `target_date`: `TIMESTAMPTZ`, for the goal's target date.
        *   `description`: `TEXT` (optional).
    *   **Relationship**: One-to-many from `auth.users` to `wallets`.

3.  **Create the `financial_instruments` Table**
    *   **Purpose**: To store details about each financial instrument within a wallet.
    *   **Columns**:
        *   `id`: `UUID`, Primary Key.
        *   `wallet_id`: `UUID`, Foreign Key referencing `public.wallets(id)`.
        *   `type`: `public.instrument_type`, using the custom ENUM.
        *   `name`: `TEXT` (optional), to distinguish between instruments of the same type.
        *   `goal_amount`: `BIGINT`, representing the specific goal for this instrument.
    *   **Relationship**: One-to-many from `wallets` to `financial_instruments`.

4.  **Create the `financial_instrument_operations` Table**
    *   **Purpose**: To log all monetary operations (e.g., deposits) for a specific financial instrument. The sum of these operations will determine the instrument's current value.
    *   **Columns**:
        *   `id`: `UUID`, Primary Key.
        *   `instrument_id`: `UUID`, Foreign Key referencing `public.financial_instruments(id)`.
        *   `amount`: `BIGINT`, the value of the operation in grosze.
        *   `operation_date`: `TIMESTAMPTZ`.
        *   `description`: `TEXT` (optional).
    *   **Relationship**: One-to-many from `financial_instruments` to `financial_instrument_operations`.

5.  **Implement Data Integrity and Performance Features**
    *   **Cascading Deletes**: Apply `ON DELETE CASCADE` to all foreign key constraints so that deleting a wallet also removes its associated instruments and their operations.
    *   **Indexing**: Add indexes to the foreign key columns (`user_id`, `wallet_id`, `instrument_id`) to optimize query performance for fetching user-specific data.
    *   **Constraints**: Use `CHECK` constraints on monetary columns (`goal_amount`, `amount`) to ensure values are non-negative.

6.  **Set Up Row-Level Security (RLS)**
    *   Enable RLS on all three tables (`wallets`, `financial_instruments`, `financial_instrument_operations`).
    *   Create policies that restrict all (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) operations, ensuring users can only interact with data linked to their own `user_id`.

7.  **Generate Supabase Migration File**
    *   Combine all the above steps into a single SQL script formatted as a Supabase migration file. This will ensure the entire schema can be created repeatably and tracked in version control.
