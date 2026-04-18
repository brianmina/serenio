-- Financial tracker schema

create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  type text not null check (type in ('income', 'expense')),
  amount numeric(10,2) not null,
  category text not null,
  description text,
  date date not null default current_date,
  created_at timestamptz default now()
);

create table if not exists budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  category text not null,
  limit_amount numeric(10,2) not null,
  month integer not null check (month between 1 and 12),
  year integer not null,
  created_at timestamptz default now(),
  unique(user_id, category, month, year)
);

-- Enable RLS
alter table transactions enable row level security;
alter table budgets enable row level security;

-- Policies
drop policy if exists "Users see own transactions" on transactions;
drop policy if exists "Users see own budgets" on budgets;

create policy "Users see own transactions" on transactions for all using (auth.uid() = user_id);
create policy "Users see own budgets" on budgets for all using (auth.uid() = user_id);
