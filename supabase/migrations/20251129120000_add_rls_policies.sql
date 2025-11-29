-- migration: add row level security (rls) policies for wallets, instruments, and instrument_value_changes
-- purpose: implements granular rls policies for all crud operations on user data tables
-- affected tables: wallets, instruments, instrument_value_changes
-- special considerations: 
--   - authenticated users can only access their own data (owner_id = auth.uid())
--   - anon users are denied all access as these tables contain private user data
--   - instrument_value_changes is an immutable audit log: users can only select their history
--   - policies are separated by operation (select, insert, update, delete) and role (authenticated, anon)

-- ============================================================================
-- wallets table: rls policies
-- ============================================================================

-- policy: allow authenticated users to select their own wallets
-- rationale: users need to view their own wallet data for the application to function
create policy "authenticated_select_own_wallets"
on wallets
for select
to authenticated
using (owner_id = auth.uid());

-- policy: deny anonymous users from selecting wallets
-- rationale: wallets contain private financial data and should not be accessible without authentication
create policy "anon_deny_select_wallets"
on wallets
for select
to anon
using (false);

-- policy: allow authenticated users to insert their own wallets
-- rationale: users need to create new wallets, ensuring owner_id matches their user id
create policy "authenticated_insert_own_wallets"
on wallets
for insert
to authenticated
with check (owner_id = auth.uid());

-- policy: deny anonymous users from inserting wallets
-- rationale: creating wallets requires authentication to establish ownership
create policy "anon_deny_insert_wallets"
on wallets
for insert
to anon
with check (false);

-- policy: allow authenticated users to update their own wallets
-- rationale: users need to modify wallet name, description, or soft-delete their wallets
create policy "authenticated_update_own_wallets"
on wallets
for update
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

-- policy: deny anonymous users from updating wallets
-- rationale: modifying wallets requires authentication and ownership verification
create policy "anon_deny_update_wallets"
on wallets
for update
to anon
using (false);

-- policy: allow authenticated users to delete their own wallets
-- rationale: users should be able to permanently remove their wallet records (hard delete)
-- note: soft deletes are handled via update operations; this policy covers hard deletes
create policy "authenticated_delete_own_wallets"
on wallets
for delete
to authenticated
using (owner_id = auth.uid());

-- policy: deny anonymous users from deleting wallets
-- rationale: deleting wallets requires authentication and ownership verification
create policy "anon_deny_delete_wallets"
on wallets
for delete
to anon
using (false);

-- ============================================================================
-- instruments table: rls policies
-- ============================================================================

-- policy: allow authenticated users to select their own instruments
-- rationale: users need to view their investment instruments within their wallets
create policy "authenticated_select_own_instruments"
on instruments
for select
to authenticated
using (owner_id = auth.uid());

-- policy: deny anonymous users from selecting instruments
-- rationale: instruments contain private financial data and should not be accessible without authentication
create policy "anon_deny_select_instruments"
on instruments
for select
to anon
using (false);

-- policy: allow authenticated users to insert instruments into their own wallets
-- rationale: users need to create new instruments in wallets they own
-- note: owner_id is automatically set by trigger from parent wallet
create policy "authenticated_insert_own_instruments"
on instruments
for insert
to authenticated
with check (owner_id = auth.uid());

-- policy: deny anonymous users from inserting instruments
-- rationale: creating instruments requires authentication to establish ownership
create policy "anon_deny_insert_instruments"
on instruments
for insert
to anon
with check (false);

-- policy: allow authenticated users to update their own instruments
-- rationale: users need to modify instrument details, values, goals, or soft-delete their instruments
create policy "authenticated_update_own_instruments"
on instruments
for update
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

-- policy: deny anonymous users from updating instruments
-- rationale: modifying instruments requires authentication and ownership verification
create policy "anon_deny_update_instruments"
on instruments
for update
to anon
using (false);

-- policy: allow authenticated users to delete their own instruments
-- rationale: users should be able to permanently remove their instrument records (hard delete)
-- note: soft deletes are handled via update operations; this policy covers hard deletes
create policy "authenticated_delete_own_instruments"
on instruments
for delete
to authenticated
using (owner_id = auth.uid());

-- policy: deny anonymous users from deleting instruments
-- rationale: deleting instruments requires authentication and ownership verification
create policy "anon_deny_delete_instruments"
on instruments
for delete
to anon
using (false);

-- ============================================================================
-- instrument_value_changes table: rls policies
-- ============================================================================

-- policy: allow authenticated users to select value changes for their own instruments
-- rationale: users need to view the history of value changes for their instruments
-- note: joins with instruments table to verify ownership through instrument_id
create policy "authenticated_select_own_value_changes"
on instrument_value_changes
for select
to authenticated
using (
  exists (
    select 1
    from instruments
    where instruments.id = instrument_value_changes.instrument_id
      and instruments.owner_id = auth.uid()
  )
);

-- policy: deny anonymous users from selecting value changes
-- rationale: value change history contains private financial data
create policy "anon_deny_select_value_changes"
on instrument_value_changes
for select
to anon
using (false);

-- policy: deny authenticated users from inserting value changes
-- rationale: value changes are automatically created by database triggers when instrument
--            values are updated. manual inserts should not be permitted to maintain data integrity
create policy "authenticated_deny_insert_value_changes"
on instrument_value_changes
for insert
to authenticated
with check (false);

-- policy: deny anonymous users from inserting value changes
-- rationale: value changes are managed automatically by triggers
create policy "anon_deny_insert_value_changes"
on instrument_value_changes
for insert
to anon
with check (false);

-- policy: deny authenticated users from updating value changes
-- rationale: this is an immutable audit log; changes should never be modified after creation
create policy "authenticated_deny_update_value_changes"
on instrument_value_changes
for update
to authenticated
using (false);

-- policy: deny anonymous users from updating value changes
-- rationale: this is an immutable audit log
create policy "anon_deny_update_value_changes"
on instrument_value_changes
for update
to anon
using (false);

-- policy: deny authenticated users from deleting value changes
-- rationale: this is an immutable audit log; historical records should be preserved
create policy "authenticated_deny_delete_value_changes"
on instrument_value_changes
for delete
to authenticated
using (false);

-- policy: deny anonymous users from deleting value changes
-- rationale: this is an immutable audit log
create policy "anon_deny_delete_value_changes"
on instrument_value_changes
for delete
to anon
using (false);

