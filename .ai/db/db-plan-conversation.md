<conversation_summary>
<decisions>
1. Wallets are single-owner; `owner_id uuid` on `wallets` and duplicated on `instruments` maintained via trigger.
2. All monetary fields (`invested_money_grosze`, `current_value_grosze`, `goal_grosze`) stored as non-negative `BIGINT` (grosze).
3. `instruments.type` will be a Postgres enum with values `Bonds | ETF | Stocks`.
4. Soft-delete via `deleted_at timestamptz` (NULL = active); cascade soft-delete from `wallets` to `instruments`; block inserts/updates targeting soft-deleted wallets; FK `ON DELETE RESTRICT`.
5. Names case-insensitive with `citext`; uniqueness within scope: `wallets(owner_id, lower(name))` and `instruments(wallet_id, lower(name))` with partial unique indexes where `deleted_at IS NULL`; length checks (name ≤ 100, description ≤ 500).
6. Aggregates computed at query time; no cached columns; no aggregate view for MVP.
7. Value history in scope: record `before_value_grosze` and `after_value_grosze`; compute `delta` and direction at query time.
8. Automatic history capture via `AFTER UPDATE` trigger when `current_value_grosze` changes.
9. Indexing accepted: btree on `(owner_id, deleted_at)` for `wallets`, `(wallet_id, deleted_at)` for `instruments`, and `(instrument_id, created_at)` for history; partial unique indexes as above.
10. UUID primary keys (`gen_random_uuid()`), reference `auth.users(id)` for `owner_id`; `instruments.owner_id` set from parent wallet and immutable.
11. Instruments cannot be moved between wallets; prevent `wallet_id` updates.
12. `wallets.updated_at` should reflect most recent instrument changes (accepted by delegation).
13. Enable `pgcrypto` and `citext` extensions (accepted by delegation).
14. Only Astro API will access the DB in MVP; no direct client SDK access.
</decisions>

<matched_recommendations>
1. Single-owner wallets with duplicated `owner_id` on `instruments` and owner-scoped access — accepted; RLS decision deferred.
2. Money as `BIGINT` grosze with non-negative checks — accepted.
3. Postgres enum for `instruments.type` — accepted.
4. `deleted_at` soft-delete with cascading trigger and blocked writes to soft-deleted parents — accepted.
5. Case-insensitive names (`citext`), scoped uniqueness, and length constraints — accepted.
6. Compute aggregates on read; no caching; no aggregate view — accepted (view explicitly declined).
7. Value history table capturing before/after values with derived delta/direction — accepted.
8. Trigger-based automatic history entry on value change — accepted.
9. Indexing strategy for common access paths and partial unique indexes — accepted.
10. UUID PKs; `auth.users` reference; immutable `owner_id` on instruments — accepted.
11. Prevent moving instruments between wallets — accepted.
12. Propagate instrument changes to `wallets.updated_at` — accepted (by delegation).
13. Enable `pgcrypto` and `citext` extensions — accepted (by delegation).
14. RLS minimal owner-only vs. defer (server-only access) — relevance acknowledged; final decision deferred.
</matched_recommendations>

<database_planning_summary>
a. Main schema requirements
- Use `uuid` PKs for all tables; timestamps `created_at DEFAULT now()`, `updated_at` via trigger.
- Monetary columns stored as `BIGINT` (grosze) with `CHECK (value >= 0)`.
- Entities: `wallets`, `instruments`, `instrument_value_changes`; reference `auth.users(id)` for ownership.
- Soft-delete with `deleted_at`; all queries exclude soft-deleted rows; uniqueness enforced only for active rows.
- Aggregations (target, invested, current) computed at query time from active instruments; no materialized/cached aggregates; no aggregate view for MVP.

b. Key entities and relationships
- users (Supabase) 1—N wallets via `wallets.owner_id`.
- wallets 1—N instruments via `instruments.wallet_id` (and duplicated `owner_id`).
- instruments 1—N instrument_value_changes via `instrument_value_changes.instrument_id`.
- Enum `instrument_type` for `instruments.type` with values `Bonds`, `ETF`, `Stocks`.

c. Security and scalability
- Access via Astro API only in MVP; service role controls DB access. Minimal RLS remains a deferred decision; owner duplication supports future RLS if enabled.
- Soft-delete plus partial unique indexes maintain performance for active data. Indexes: `(owner_id, deleted_at)` on `wallets`, `(wallet_id, deleted_at)` on `instruments`, `(instrument_id, created_at)` on history.
- Triggers: maintain `instruments.owner_id` from wallet, prevent `wallet_id` updates, cascade soft-delete, touch `wallets.updated_at`, and record value history entries.
- Extensions: enable `pgcrypto` for UUIDs, `citext` for case-insensitive names.

d. Unresolved or clarify-before-implementation details
- RLS policy for MVP: either defer (server-only access) or enable minimal owner-only policies; both are compatible with current schema decisions.
- Soft-delete retention/recovery policy (duration, restoration behavior) not yet defined but does not block schema.
- Value history optional metadata (e.g., `note`, `reason`) not specified; can be added as nullable columns without breaking contracts.
</database_planning_summary>

<unresolved_issues>
- Final decision on enabling minimal RLS in MVP versus deferring (given server-only access via Astro).
- Define soft-delete retention and restore policy (operational, not schema-blocking).
- Whether to include optional fields on `instrument_value_changes` (e.g., `note`, `change_source`).
</unresolved_issues>
</conversation_summary>