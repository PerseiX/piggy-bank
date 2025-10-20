-- migration: 20251019185720_create_initial_schema.sql
-- description: creates the initial database schema for piggy-bank application, including wallets, financial instruments, and their operations. also sets up row-level security policies to ensure data privacy.
-- affected_tables: wallets, financial_instruments, financial_instrument_operations
-- special_considerations: this migration establishes the core tables and security policies. ensure that the `auth.users` table exists as it is referenced via foreign key.

-- step 1: define custom data types
-- create a custom enum type for financial instruments to ensure data consistency.
create type public.instrument_type as enum ('bonds', 'etf', 'stocks');

-- step 2: create the wallets table
-- this table stores wallet information, including its name, financial goal, and target date.
create table public.wallets (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) not null,
    name text not null,
    goal_amount bigint not null check (goal_amount >= 0),
    target_date timestamptz not null,
    description text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
-- add comments to the table and columns for better understanding of the schema.
comment on table public.wallets is 'stores user wallets with financial goals.';
comment on column public.wallets.goal_amount is 'goal in the smallest currency unit (e.g., grosze).';

-- add an index on user_id for faster lookups of a user''s wallets.
create index wallets_user_id_idx on public.wallets(user_id);


-- step 3: create the financial_instruments table
-- this table stores details about each financial instrument within a wallet.
create table public.financial_instruments (
    id uuid primary key default gen_random_uuid(),
    wallet_id uuid references public.wallets(id) on delete cascade not null,
    type public.instrument_type not null,
    name text,
    goal_amount bigint not null check (goal_amount >= 0),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- add comments to the table and columns for better understanding of the schema.
comment on table public.financial_instruments is 'stores financial instruments within a wallet.';
comment on column public.financial_instruments.goal_amount is 'specific goal for this instrument in the smallest currency unit.';

-- add an index on wallet_id for faster lookups of instruments in a wallet.
create index financial_instruments_wallet_id_idx on public.financial_instruments(wallet_id);


-- step 4: create the financial_instrument_operations table
-- this table logs all monetary operations for a specific financial instrument.
create table public.financial_instrument_operations (
    id uuid primary key default gen_random_uuid(),
    instrument_id uuid references public.financial_instruments(id) on delete cascade not null,
    amount bigint not null check (amount >= 0),
    operation_date timestamptz not null,
    description text,
    created_at timestamptz not null default now()
);

-- add comments to the table and columns for better understanding of the schema.
comment on table public.financial_instrument_operations is 'logs monetary operations for a financial instrument.';
comment on column public.financial_instrument_operations.amount is 'value of the operation in the smallest currency unit.';

-- add an index on instrument_id for faster lookups of operations for an instrument.
create index financial_instrument_operations_instrument_id_idx on public.financial_instrument_operations(instrument_id);


-- step 5: set up row-level security (rls)
-- enable rls on all tables to ensure data privacy.
alter table public.wallets enable row level security;
alter table public.financial_instruments enable row level security;
alter table public.financial_instrument_operations enable row level security;

-- step 6: create rls policies for the wallets table
-- policies to control access to the wallets table.
-- allow authenticated users to manage their own wallets.
create policy "allow select for authenticated users" on public.wallets for select to authenticated using (auth.uid() = user_id);
create policy "allow insert for authenticated users" on public.wallets for insert to authenticated with check (auth.uid() = user_id);
create policy "allow update for authenticated users" on public.wallets for update to authenticated using (auth.uid() = user_id);
create policy "allow delete for authenticated users" on public.wallets for delete to authenticated using (auth.uid() = user_id);

-- step 7: create rls policies for the financial_instruments table
-- policies to control access to the financial_instruments table.
-- users can only interact with instruments belonging to wallets they own.
create policy "allow select for authenticated users" on public.financial_instruments for select to authenticated using (
    exists (
        select 1 from public.wallets where wallets.id = financial_instruments.wallet_id and wallets.user_id = auth.uid()
    )
);
create policy "allow insert for authenticated users" on public.financial_instruments for insert to authenticated with check (
    exists (
        select 1 from public.wallets where wallets.id = financial_instruments.wallet_id and wallets.user_id = auth.uid()
    )
);
create policy "allow update for authenticated users" on public.financial_instruments for update to authenticated using (
    exists (
        select 1 from public.wallets where wallets.id = financial_instruments.wallet_id and wallets.user_id = auth.uid()
    )
);
create policy "allow delete for authenticated users" on public.financial_instruments for delete to authenticated using (
    exists (
        select 1 from public.wallets where wallets.id = financial_instruments.wallet_id and wallets.user_id = auth.uid()
    )
);

-- step 8: create rls policies for the financial_instrument_operations table
-- policies to control access to the financial_instrument_operations table.
-- users can only interact with operations belonging to instruments in wallets they own.
create policy "allow select for authenticated users" on public.financial_instrument_operations for select to authenticated using (
    exists (
        select 1 from public.financial_instruments fi
        join public.wallets w on fi.wallet_id = w.id
        where fi.id = financial_instrument_operations.instrument_id and w.user_id = auth.uid()
    )
);
create policy "allow insert for authenticated users" on public.financial_instrument_operations for insert to authenticated with check (
    exists (
        select 1 from public.financial_instruments fi
        join public.wallets w on fi.wallet_id = w.id
        where fi.id = financial_instrument_operations.instrument_id and w.user_id = auth.uid()
    )
);
create policy "allow update for authenticated users" on public.financial_instrument_operations for update to authenticated using (
    exists (
        select 1 from public.financial_instruments fi
        join public.wallets w on fi.wallet_id = w.id
        where fi.id = financial_instrument_operations.instrument_id and w.user_id = auth.uid()
    )
);
create policy "allow delete for authenticated users" on public.financial_instrument_operations for delete to authenticated using (
    exists (
        select 1 from public.financial_instruments fi
        join public.wallets w on fi.wallet_id = w.id
        where fi.id = financial_instrument_operations.instrument_id and w.user_id = auth.uid()
    )
);
