# Database Schema Plan - Financial Wallets

## 1. Extensions

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;
```

## 2. Custom Types

### Instrument Type Enum
```sql
CREATE TYPE instrument_type AS ENUM ('Bonds', 'ETF', 'Stocks');
```

## 3. Tables

### 3.1 wallets

Stores user wallet information with soft-delete support.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PRIMARY KEY DEFAULT gen_random_uuid() | Unique wallet identifier |
| owner_id | uuid | NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT | User who owns the wallet |
| name | citext | NOT NULL CHECK (length(name) > 0 AND length(name) <= 100) | Wallet name (case-insensitive) |
| description | text | CHECK (description IS NULL OR length(description) <= 500) | Optional wallet description |
| deleted_at | timestamptz | NULL | Soft-delete timestamp (NULL = active) |
| created_at | timestamptz | NOT NULL DEFAULT now() | Creation timestamp |
| updated_at | timestamptz | NOT NULL DEFAULT now() | Last modification timestamp |

**Constraints:**
- `CONSTRAINT wallets_name_length CHECK (length(name) > 0 AND length(name) <= 100)`
- `CONSTRAINT wallets_description_length CHECK (description IS NULL OR length(description) <= 500)`

### 3.2 instruments

Stores financial instruments within wallets.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PRIMARY KEY DEFAULT gen_random_uuid() | Unique instrument identifier |
| wallet_id | uuid | NOT NULL REFERENCES wallets(id) ON DELETE RESTRICT | Parent wallet |
| owner_id | uuid | NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT | Duplicated from wallet for access control |
| type | instrument_type | NOT NULL | Type: Bonds, ETF, or Stocks |
| name | citext | NOT NULL CHECK (length(name) > 0 AND length(name) <= 100) | Instrument name (case-insensitive) |
| short_description | text | CHECK (short_description IS NULL OR length(short_description) <= 500) | Optional description |
| invested_money_grosze | bigint | NOT NULL CHECK (invested_money_grosze >= 0) | Amount invested in grosze |
| current_value_grosze | bigint | NOT NULL CHECK (current_value_grosze >= 0) | Current value in grosze |
| goal_grosze | bigint | CHECK (goal_grosze IS NULL OR goal_grosze >= 0) | Target value in grosze |
| deleted_at | timestamptz | NULL | Soft-delete timestamp (NULL = active) |
| created_at | timestamptz | NOT NULL DEFAULT now() | Creation timestamp |
| updated_at | timestamptz | NOT NULL DEFAULT now() | Last modification timestamp |

**Constraints:**
- `CONSTRAINT instruments_name_length CHECK (length(name) > 0 AND length(name) <= 100)`
- `CONSTRAINT instruments_description_length CHECK (short_description IS NULL OR length(short_description) <= 500)`
- `CONSTRAINT instruments_invested_money_non_negative CHECK (invested_money_grosze >= 0)`
- `CONSTRAINT instruments_current_value_non_negative CHECK (current_value_grosze >= 0)`
- `CONSTRAINT instruments_goal_non_negative CHECK (goal_grosze IS NULL OR goal_grosze >= 0)`

### 3.3 instrument_value_changes

Tracks historical changes to instrument current values.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PRIMARY KEY DEFAULT gen_random_uuid() | Unique change record identifier |
| instrument_id | uuid | NOT NULL REFERENCES instruments(id) ON DELETE RESTRICT | Related instrument |
| before_value_grosze | bigint | NOT NULL CHECK (before_value_grosze >= 0) | Value before change in grosze |
| after_value_grosze | bigint | NOT NULL CHECK (after_value_grosze >= 0) | Value after change in grosze |
| created_at | timestamptz | NOT NULL DEFAULT now() | Timestamp of change |

**Constraints:**
- `CONSTRAINT value_changes_before_non_negative CHECK (before_value_grosze >= 0)`
- `CONSTRAINT value_changes_after_non_negative CHECK (after_value_grosze >= 0)`

**Note:** Delta and direction are computed at query time:
- `delta = after_value_grosze - before_value_grosze`
- `direction = SIGN(delta)` or categorical (positive/negative/zero)

## 4. Indexes

### 4.1 Performance Indexes

```sql
-- Wallets: owner-scoped queries filtering by soft-delete
CREATE INDEX idx_wallets_owner_deleted ON wallets(owner_id, deleted_at);

-- Instruments: wallet-scoped queries filtering by soft-delete
CREATE INDEX idx_instruments_wallet_deleted ON instruments(wallet_id, deleted_at);

-- Instrument value changes: instrument-scoped history with time ordering
CREATE INDEX idx_value_changes_instrument_created ON instrument_value_changes(instrument_id, created_at DESC);
```

### 4.2 Unique Constraints (Partial Indexes)

```sql
-- Wallets: unique name per owner (case-insensitive) for active records only
CREATE UNIQUE INDEX idx_wallets_owner_name_unique 
ON wallets(owner_id, lower(name)) 
WHERE deleted_at IS NULL;

-- Instruments: unique name per wallet (case-insensitive) for active records only
CREATE UNIQUE INDEX idx_instruments_wallet_name_unique 
ON instruments(wallet_id, lower(name)) 
WHERE deleted_at IS NULL;
```

## 5. Triggers

### 5.1 Updated At Trigger Function

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### 5.2 Apply Updated At to Tables

```sql
CREATE TRIGGER trigger_wallets_updated_at
BEFORE UPDATE ON wallets
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_instruments_updated_at
BEFORE UPDATE ON instruments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
```

### 5.3 Set Instrument Owner from Wallet

```sql
CREATE OR REPLACE FUNCTION set_instrument_owner_from_wallet()
RETURNS TRIGGER AS $$
BEGIN
    -- Set owner_id from parent wallet on insert
    SELECT owner_id INTO NEW.owner_id
    FROM wallets
    WHERE id = NEW.wallet_id;
    
    IF NEW.owner_id IS NULL THEN
        RAISE EXCEPTION 'Wallet not found or has no owner';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_instrument_owner
BEFORE INSERT ON instruments
FOR EACH ROW
EXECUTE FUNCTION set_instrument_owner_from_wallet();
```

### 5.4 Prevent Instrument Wallet Transfer

```sql
CREATE OR REPLACE FUNCTION prevent_instrument_wallet_transfer()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.wallet_id != NEW.wallet_id THEN
        RAISE EXCEPTION 'Cannot move instrument between wallets';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prevent_wallet_transfer
BEFORE UPDATE ON instruments
FOR EACH ROW
EXECUTE FUNCTION prevent_instrument_wallet_transfer();
```

### 5.5 Cascade Soft-Delete from Wallet to Instruments

```sql
CREATE OR REPLACE FUNCTION cascade_soft_delete_instruments()
RETURNS TRIGGER AS $$
BEGIN
    -- When a wallet is soft-deleted, cascade to its instruments
    IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
        UPDATE instruments
        SET deleted_at = NEW.deleted_at
        WHERE wallet_id = NEW.id
          AND deleted_at IS NULL;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_cascade_soft_delete
AFTER UPDATE ON wallets
FOR EACH ROW
EXECUTE FUNCTION cascade_soft_delete_instruments();
```

### 5.6 Block Operations on Soft-Deleted Wallets

```sql
CREATE OR REPLACE FUNCTION block_soft_deleted_wallet_operations()
RETURNS TRIGGER AS $$
DECLARE
    wallet_deleted_at timestamptz;
BEGIN
    -- Check if target wallet is soft-deleted
    SELECT deleted_at INTO wallet_deleted_at
    FROM wallets
    WHERE id = NEW.wallet_id;
    
    IF wallet_deleted_at IS NOT NULL THEN
        RAISE EXCEPTION 'Cannot add or update instruments in a soft-deleted wallet';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_block_soft_deleted_wallet_inserts
BEFORE INSERT ON instruments
FOR EACH ROW
EXECUTE FUNCTION block_soft_deleted_wallet_operations();

CREATE TRIGGER trigger_block_soft_deleted_wallet_updates
BEFORE UPDATE ON instruments
FOR EACH ROW
EXECUTE FUNCTION block_soft_deleted_wallet_operations();
```

### 5.7 Touch Wallet Updated At on Instrument Changes

```sql
CREATE OR REPLACE FUNCTION touch_wallet_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    -- Update parent wallet's updated_at timestamp
    UPDATE wallets
    SET updated_at = now()
    WHERE id = COALESCE(NEW.wallet_id, OLD.wallet_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_instrument_touch_wallet
AFTER INSERT OR UPDATE OR DELETE ON instruments
FOR EACH ROW
EXECUTE FUNCTION touch_wallet_updated_at();
```

### 5.8 Record Instrument Value Changes

```sql
CREATE OR REPLACE FUNCTION record_instrument_value_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Only record if current_value_grosze actually changed
    IF OLD.current_value_grosze != NEW.current_value_grosze THEN
        INSERT INTO instrument_value_changes (
            instrument_id,
            before_value_grosze,
            after_value_grosze
        ) VALUES (
            NEW.id,
            OLD.current_value_grosze,
            NEW.current_value_grosze
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_record_value_change
AFTER UPDATE ON instruments
FOR EACH ROW
EXECUTE FUNCTION record_instrument_value_change();
```

## 6. Relationships

### Entity Relationships

1. **auth.users → wallets** (1:N)
   - One user can own many wallets
   - Foreign key: `wallets.owner_id → auth.users.id`
   - Cascade: `ON DELETE RESTRICT`

2. **wallets → instruments** (1:N)
   - One wallet contains many instruments
   - Foreign key: `instruments.wallet_id → wallets.id`
   - Cascade: `ON DELETE RESTRICT`
   - Soft-delete cascade via trigger

3. **auth.users → instruments** (1:N)
   - One user owns many instruments (duplicated for access control)
   - Foreign key: `instruments.owner_id → auth.users.id`
   - Cascade: `ON DELETE RESTRICT`
   - Set automatically from parent wallet

4. **instruments → instrument_value_changes** (1:N)
   - One instrument has many value change records
   - Foreign key: `instrument_value_changes.instrument_id → instruments.id`
   - Cascade: `ON DELETE RESTRICT`
   - Created automatically via trigger on value updates

## 7. Aggregations

All wallet aggregates are computed at query time from active instruments:

### Wallet Aggregates Query Pattern

```sql
SELECT 
    w.id,
    w.name,
    w.description,
    -- Sum of all instrument goals
    COALESCE(SUM(i.goal_grosze) FILTER (WHERE i.deleted_at IS NULL), 0) AS target_grosze,
    -- Sum of all current values
    COALESCE(SUM(i.current_value_grosze) FILTER (WHERE i.deleted_at IS NULL), 0) AS current_value_grosze,
    -- Sum of all invested amounts
    COALESCE(SUM(i.invested_money_grosze) FILTER (WHERE i.deleted_at IS NULL), 0) AS invested_sum_grosze,
    -- Progress percentage (handle division by zero)
    CASE 
        WHEN COALESCE(SUM(i.goal_grosze) FILTER (WHERE i.deleted_at IS NULL), 0) = 0 
        THEN 0
        ELSE (COALESCE(SUM(i.current_value_grosze) FILTER (WHERE i.deleted_at IS NULL), 0)::numeric / 
              COALESCE(SUM(i.goal_grosze) FILTER (WHERE i.deleted_at IS NULL), 1)::numeric * 100)
    END AS progress_percent,
    -- Performance percentage (handle division by zero)
    CASE 
        WHEN COALESCE(SUM(i.invested_money_grosze) FILTER (WHERE i.deleted_at IS NULL), 0) = 0 
        THEN 0
        ELSE ((COALESCE(SUM(i.current_value_grosze) FILTER (WHERE i.deleted_at IS NULL), 0) - 
               COALESCE(SUM(i.invested_money_grosze) FILTER (WHERE i.deleted_at IS NULL), 0))::numeric /
              COALESCE(SUM(i.invested_money_grosze) FILTER (WHERE i.deleted_at IS NULL), 1)::numeric * 100)
    END AS performance_percent
FROM wallets w
LEFT JOIN instruments i ON i.wallet_id = w.id
WHERE w.deleted_at IS NULL
  AND w.owner_id = :current_user_id
GROUP BY w.id, w.name, w.description
ORDER BY w.updated_at DESC;
```

### Value Change History Query Pattern

```sql
SELECT 
    id,
    instrument_id,
    before_value_grosze,
    after_value_grosze,
    (after_value_grosze - before_value_grosze) AS delta_grosze,
    CASE 
        WHEN after_value_grosze > before_value_grosze THEN 'increase'
        WHEN after_value_grosze < before_value_grosze THEN 'decrease'
        ELSE 'unchanged'
    END AS direction,
    created_at
FROM instrument_value_changes
WHERE instrument_id = :instrument_id
ORDER BY created_at DESC;
```

## 8. Row-Level Security (RLS)

**Decision Status:** Deferred for MVP

The schema includes `owner_id` on both `wallets` and `instruments` to support future RLS policies. For MVP, access control is enforced at the Astro API layer using the service role.

### Future RLS Policy Examples (Not Implemented in MVP)

If RLS is enabled in the future:

```sql
-- Enable RLS on tables
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE instruments ENABLE ROW LEVEL SECURITY;
ALTER TABLE instrument_value_changes ENABLE ROW LEVEL SECURITY;

-- Wallets: users can only access their own wallets
CREATE POLICY wallets_owner_policy ON wallets
    FOR ALL
    USING (owner_id = auth.uid());

-- Instruments: users can only access instruments they own
CREATE POLICY instruments_owner_policy ON instruments
    FOR ALL
    USING (owner_id = auth.uid());

-- Value changes: users can only access changes for their instruments
CREATE POLICY value_changes_owner_policy ON instrument_value_changes
    FOR SELECT
    USING (
        instrument_id IN (
            SELECT id FROM instruments WHERE owner_id = auth.uid()
        )
    );
```

## 9. Access Patterns and Query Optimization

### Primary Access Patterns

1. **List user's active wallets with aggregates**
   - Filter: `owner_id = :user_id AND deleted_at IS NULL`
   - Index: `idx_wallets_owner_deleted`
   - Join: LEFT JOIN instruments for aggregation

2. **Get wallet detail with instruments**
   - Filter: `wallet.id = :wallet_id AND wallet.deleted_at IS NULL`
   - Filter instruments: `wallet_id = :wallet_id AND deleted_at IS NULL`
   - Index: `idx_instruments_wallet_deleted`

3. **Get instrument value change history**
   - Filter: `instrument_id = :instrument_id`
   - Order: `created_at DESC`
   - Index: `idx_value_changes_instrument_created`

4. **Create wallet** (check name uniqueness)
   - Partial unique index: `idx_wallets_owner_name_unique`

5. **Create instrument** (check name uniqueness, validate wallet)
   - Partial unique index: `idx_instruments_wallet_name_unique`
   - Trigger sets `owner_id` automatically

## 10. Design Notes

### Monetary Values
- All monetary amounts stored as `BIGINT` in grosze (1 PLN = 100 grosze)
- Frontend displays as PLN with two decimal places
- No floating-point arithmetic to avoid rounding errors
- Non-negative constraints enforced at database level

### Soft-Delete Strategy
- Uses `deleted_at` timestamp (NULL = active)
- Cascade soft-delete from wallet to instruments via trigger
- Blocks new/updated instruments on soft-deleted wallets
- Partial unique indexes ensure uniqueness only for active records
- Queries must explicitly filter `WHERE deleted_at IS NULL`

### Immutability Constraints
- `instruments.owner_id` cannot be updated (set once from wallet on insert)
- `instruments.wallet_id` cannot be changed (prevent moving between wallets)
- Foreign keys use `ON DELETE RESTRICT` to prevent accidental data loss

### Timestamp Maintenance
- `created_at` set once on insert via `DEFAULT now()`
- `updated_at` maintained via trigger on every update
- `wallets.updated_at` touched when child instruments change

### Case-Insensitive Names
- Uses PostgreSQL `citext` extension for case-insensitive text
- Uniqueness checked on `lower(name)` within scope (owner/wallet)
- Preserves original casing in storage for display

### Value History Tracking
- Automatic capture via trigger when `current_value_grosze` changes
- Stores before/after values; delta computed at query time
- Immutable audit trail (no updates/deletes on history records)
- Can be extended with optional metadata (note, change_source) without breaking schema

### Performance Considerations
- No materialized aggregates; computed on read for MVP
- Indexes optimized for owner-scoped and wallet-scoped queries
- Partial unique indexes reduce index size and improve write performance
- History table grows with value updates; may require archival strategy for scale

### Future Extensibility
- Schema supports future RLS with duplicated `owner_id`
- Soft-delete allows restoration without data loss
- History table can accept additional columns (note, change_source)
- Enum types can be extended with new instrument types via migration

## 11. Unresolved Items

1. **RLS Policy Decision:** Enable minimal owner-only RLS in MVP vs. defer to post-MVP (server-only access confirmed for MVP)
2. **Soft-Delete Retention:** Define policy for how long soft-deleted records are kept and restoration UX
3. **History Metadata:** Decide whether to add optional fields to `instrument_value_changes` (e.g., `note`, `change_source`)
4. **Archival Strategy:** Plan for history table growth if instruments are updated frequently over long periods

---

**Schema Version:** 1.0  
**Last Updated:** 2025-11-02  
**Status:** Ready for migration implementation
