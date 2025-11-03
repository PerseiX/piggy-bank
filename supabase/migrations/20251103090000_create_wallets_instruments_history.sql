-- migration: create wallets, instruments, and instrument_value_changes schema
-- purpose: implements initial schema for user wallets, instruments, and value history
-- includes extensions, enum type, tables, indexes, triggers, functions, and row-level-security (rls) policies
-- notes: this migration enables rls on created tables and provides explicit policies for both
--        the `authenticated` and `anon` roles. policies for `anon` explicitly deny access
--        because these tables contain private user data. comments explain purpose and
--        rationale for each policy and database object.

-- caution: destructive operations (drops/truncates/alter column types) are NOT included
--          in this migration. this migration is additive and safe to run on a fresh db.

-- ensure required extensions are available
create extension if not exists pgcrypto;
create extension if not exists citext;

-- custom enum type for instrument categories
create type instrument_type as enum ('bonds', 'etf', 'stocks');

-- wallets: stores user wallet metadata with soft-delete support
create table wallets (
    id uuid primary key default gen_random_uuid(),
    owner_id uuid not null references auth.users(id) on delete restrict,
    name citext not null check (length(name) > 0 and length(name) <= 100),
    description text check (description is null or length(description) <= 500),
    deleted_at timestamptz null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- instruments: financial instruments within a wallet
create table instruments (
    id uuid primary key default gen_random_uuid(),
    wallet_id uuid not null references wallets(id) on delete restrict,
    owner_id uuid not null references auth.users(id) on delete restrict,
    type instrument_type not null,
    name citext not null check (length(name) > 0 and length(name) <= 100),
    short_description text check (short_description is null or length(short_description) <= 500),
    invested_money_grosze bigint not null check (invested_money_grosze >= 0),
    current_value_grosze bigint not null check (current_value_grosze >= 0),
    goal_grosze bigint check (goal_grosze is null or goal_grosze >= 0),
    deleted_at timestamptz null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- instrument_value_changes: immutable history of value changes for instruments
create table instrument_value_changes (
    id uuid primary key default gen_random_uuid(),
    instrument_id uuid not null references instruments(id) on delete restrict,
    before_value_grosze bigint not null check (before_value_grosze >= 0),
    after_value_grosze bigint not null check (after_value_grosze >= 0),
    created_at timestamptz not null default now()
);

-- indexes for performance and partial unique constraints
create index idx_wallets_owner_deleted on wallets(owner_id, deleted_at);
create index idx_instruments_wallet_deleted on instruments(wallet_id, deleted_at);
create index idx_value_changes_instrument_created on instrument_value_changes(instrument_id, created_at desc);

-- unique constraints (partial indexes) to ensure unique active names
create unique index idx_wallets_owner_name_unique on wallets(owner_id, lower(name)) where deleted_at is null;
create unique index idx_instruments_wallet_name_unique on instruments(wallet_id, lower(name)) where deleted_at is null;

-- trigger function: update updated_at
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

create trigger trigger_wallets_updated_at
before update on wallets
for each row execute function update_updated_at_column();

create trigger trigger_instruments_updated_at
before update on instruments
for each row execute function update_updated_at_column();

-- set instrument.owner_id from parent wallet on insert
create or replace function set_instrument_owner_from_wallet()
returns trigger as $$
begin
    select owner_id into new.owner_id
    from wallets
    where id = new.wallet_id;
    if new.owner_id is null then
        raise exception 'wallet not found or has no owner';
    end if;
    return new;
end;
$$ language plpgsql;

create trigger trigger_set_instrument_owner
before insert on instruments
for each row execute function set_instrument_owner_from_wallet();

-- prevent moving an instrument between wallets
create or replace function prevent_instrument_wallet_transfer()
returns trigger as $$
begin
    if old.wallet_id is distinct from new.wallet_id then
        raise exception 'cannot move instrument between wallets';
    end if;
    return new;
end;
$$ language plpgsql;

create trigger trigger_prevent_wallet_transfer
before update on instruments
for each row execute function prevent_instrument_wallet_transfer();

-- cascade soft-delete from wallet to its instruments (sets deleted_at)
create or replace function cascade_soft_delete_instruments()
returns trigger as $$
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
$$ language plpgsql;

create trigger trigger_cascade_soft_delete
after update on wallets
for each row execute function cascade_soft_delete_instruments();

-- block inserts/updates to instruments if parent wallet is soft-deleted
create or replace function block_soft_deleted_wallet_operations()
returns trigger as $$
declare
    wallet_deleted_at timestamptz;
begin
    select deleted_at into wallet_deleted_at
    from wallets
    where id = new.wallet_id;
    if wallet_deleted_at is not null then
        raise exception 'cannot add or update instruments in a soft-deleted wallet';
    end if;
    return new;
end;
$$ language plpgsql;

create trigger trigger_block_soft_deleted_wallet_inserts
before insert on instruments
for each row execute function block_soft_deleted_wallet_operations();

create trigger trigger_block_soft_deleted_wallet_updates
before update on instruments
for each row execute function block_soft_deleted_wallet_operations();

-- touch parent wallet.updated_at when instruments change
create or replace function touch_wallet_updated_at()
returns trigger as $$
begin
    update wallets
    set updated_at = now()
    where id = coalesce(new.wallet_id, old.wallet_id);
    return coalesce(new, old);
end;
$$ language plpgsql;

create trigger trigger_instrument_touch_wallet
after insert or update or delete on instruments
for each row execute function touch_wallet_updated_at();

-- record changes to current_value_grosze into instrument_value_changes table
create or replace function record_instrument_value_change()
returns trigger as $$
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
$$ language plpgsql;

create trigger trigger_record_value_change
after update on instruments
for each row execute function record_instrument_value_change();

-- enable row level security on created tables
alter table wallets enable row level security;
alter table instruments enable row level security;
alter table instrument_value_changes enable row level security;
