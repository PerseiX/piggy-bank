-- migration: allow cascade soft-delete of instruments when parent wallet is deleted
-- purpose: adjust trigger guard to permit instrument updates that only set deleted_at
--          during wallet soft-delete propagation, while still blocking other writes
--          when the parent wallet is soft-deleted.

create or replace function block_soft_deleted_wallet_operations()
returns trigger as $$
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
$$ language plpgsql;

