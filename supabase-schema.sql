-- Create tables only if they don't exist
create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  amount numeric(10,2) not null,
  category text not null,
  description text,
  date date not null default current_date,
  created_at timestamptz default now()
);

create table if not exists food_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  meal_type text not null,
  description text not null,
  calories integer,
  date date not null default current_date,
  created_at timestamptz default now()
);

create table if not exists sleep_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  bedtime timestamptz not null,
  wake_time timestamptz not null,
  quality integer check (quality between 1 and 5),
  notes text,
  date date not null default current_date,
  created_at timestamptz default now()
);

create table if not exists journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text,
  content text not null,
  mood text,
  date date not null default current_date,
  created_at timestamptz default now()
);

-- Enable RLS
alter table expenses enable row level security;
alter table food_logs enable row level security;
alter table sleep_logs enable row level security;
alter table journal_entries enable row level security;

-- Policies (drop first to avoid conflicts)
drop policy if exists "Users see own expenses" on expenses;
drop policy if exists "Users see own food logs" on food_logs;
drop policy if exists "Users see own sleep logs" on sleep_logs;
drop policy if exists "Users see own journal entries" on journal_entries;

create policy "Users see own expenses" on expenses for all using (auth.uid() = user_id);
create policy "Users see own food logs" on food_logs for all using (auth.uid() = user_id);
create policy "Users see own sleep logs" on sleep_logs for all using (auth.uid() = user_id);
create policy "Users see own journal entries" on journal_entries for all using (auth.uid() = user_id);
