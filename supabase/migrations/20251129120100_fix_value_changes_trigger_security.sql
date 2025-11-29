-- migration: fix trigger functions to bypass rls for system operations
-- purpose: ensure all trigger functions can perform their system-level operations
--           despite rls policies that restrict user access
-- affected functions: set_instrument_owner_from_wallet, cascade_soft_delete_instruments,
--                     block_soft_deleted_wallet_operations, touch_wallet_updated_at,
--                     record_instrument_value_change
-- special considerations:
--   - all trigger functions are set to SECURITY DEFINER to run with elevated privileges
--   - this allows triggers to bypass rls and perform system operations automatically
--   - users still cannot manually perform these operations due to rls policies
--   - search_path is explicitly set to 'public' for security

-- set instrument.owner_id from parent wallet on insert
-- uses SECURITY DEFINER to read from wallets table regardless of rls
create or replace function set_instrument_owner_from_wallet()
returns trigger
security definer
set search_path = public
language plpgsql
as $$
begin
    select owner_id into new.owner_id
    from wallets
    where id = new.wallet_id;
    if new.owner_id is null then
        raise exception 'wallet not found or has no owner';
    end if;
    return new;
end;
$$;

-- cascade soft-delete from wallet to its instruments (sets deleted_at)
-- uses SECURITY DEFINER to update instruments regardless of rls
create or replace function cascade_soft_delete_instruments()
returns trigger
security definer
set search_path = public
language plpgsql
as $$
begin
    -- when a wallet is soft-deleted, propagate the same timestamp to active instruments
    if old.deleted_at is null and new.deleted_at is not null then
        update instruments
        set deleted_at = new.deleted_at
        where wallet_id = new.id
          and deleted_at is null;
    end if;
    return new;
end;
$$;

-- block inserts/updates to instruments if parent wallet is soft-deleted
-- uses SECURITY DEFINER to read wallet status regardless of rls
create or replace function block_soft_deleted_wallet_operations()
returns trigger
security definer
set search_path = public
language plpgsql
as $$
declare
    wallet_deleted_at timestamptz;
begin
    select deleted_at into wallet_deleted_at
    from wallets
    where id = coalesce(new.wallet_id, old.wallet_id);

    -- if wallet is active we allow normal operations
    if wallet_deleted_at is null then
        return new;
    end if;

    -- block inserts into soft-deleted wallets
    if TG_OP = 'INSERT' then
        raise exception 'cannot add or update instruments in a soft-deleted wallet';
    end if;

    -- allow cascade updates that only set deleted_at (and updated_at via trigger)
    if TG_OP = 'UPDATE' then
        if old.deleted_at is null
           and new.deleted_at is not null
           and to_jsonb(new) - 'deleted_at' - 'updated_at' =
               to_jsonb(old) - 'deleted_at' - 'updated_at' then
            return new;
        end if;

        raise exception 'cannot add or update instruments in a soft-deleted wallet';
    end if;

    return new;
end;
$$;

-- touch parent wallet.updated_at when instruments change
-- uses SECURITY DEFINER to update wallets regardless of rls
create or replace function touch_wallet_updated_at()
returns trigger
security definer
set search_path = public
language plpgsql
as $$
begin
    update wallets
    set updated_at = now()
    where id = coalesce(new.wallet_id, old.wallet_id);
    return coalesce(new, old);
end;
$$;

-- record changes to current_value_grosze into instrument_value_changes table
-- uses SECURITY DEFINER to insert audit records regardless of rls
create or replace function record_instrument_value_change()
returns trigger
security definer
set search_path = public
language plpgsql
as $$
begin
    -- only record when the value actually changes
    if old.current_value_grosze is distinct from new.current_value_grosze then
        insert into instrument_value_changes (
            instrument_id,
            before_value_grosze,
            after_value_grosze
        ) values (
            new.id,
            old.current_value_grosze,
            new.current_value_grosze
        );
    end if;
    return new;
end;
$$;

-- comments explaining the security model
comment on function set_instrument_owner_from_wallet() is 
'Trigger function to automatically set instrument owner from parent wallet. Uses SECURITY DEFINER to bypass RLS policies.';

comment on function cascade_soft_delete_instruments() is 
'Trigger function to cascade soft-delete from wallet to instruments. Uses SECURITY DEFINER to bypass RLS policies.';

comment on function block_soft_deleted_wallet_operations() is 
'Trigger function to prevent operations on instruments in soft-deleted wallets. Uses SECURITY DEFINER to bypass RLS policies.';

comment on function touch_wallet_updated_at() is 
'Trigger function to update wallet timestamp when instruments change. Uses SECURITY DEFINER to bypass RLS policies.';

comment on function record_instrument_value_change() is 
'Trigger function to automatically record instrument value changes. Uses SECURITY DEFINER to bypass RLS policies and ensure audit trail integrity.';

