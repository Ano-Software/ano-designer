create extension if not exists "pgcrypto";

-- Profiles enriched fields for billing & theme preferences
alter table if exists public.profiles add column if not exists theme text;
alter table if exists public.profiles add column if not exists plan_id text;
alter table if exists public.profiles add column if not exists plan_expires_at date;
alter table if exists public.profiles add column if not exists active boolean;
alter table if exists public.profiles add column if not exists created_at timestamptz default timezone(''utc'', now());
alter table if exists public.profiles add column if not exists updated_at timestamptz default timezone(''utc'', now());

alter table if exists public.profiles alter column created_at set default timezone(''utc'', now());
alter table if exists public.profiles alter column updated_at set default timezone(''utc'', now());

update public.profiles set created_at = timezone(''utc'', now()) where created_at is null;
update public.profiles set updated_at = timezone(''utc'', now()) where updated_at is null;

alter table if exists public.profiles alter column created_at set not null;
alter table if exists public.profiles alter column updated_at set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_theme_check'
  ) then
    alter table public.profiles
      add constraint profiles_theme_check check (theme is null or theme in ('light','dark'));
  end if;
end;
$$;

-- Ensure updated_at automation for profiles
set search_path to public;
drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.handle_updated_at();
reset search_path;

alter table if exists public.profiles enable row level security;

create policy if not exists "Profiles select own" on public.profiles
  for select
  using (auth.uid() = id);

create policy if not exists "Profiles insert own" on public.profiles
  for insert
  with check (auth.uid() = id);

create policy if not exists "Profiles update own" on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Subscriptions table handles billing state
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  plan_id text not null,
  mode text not null check (mode in ('monthly','recurring')),
  status text not null,
  manage_url text,
  created_at timestamptz not null default timezone(''utc'', now()),
  updated_at timestamptz not null default timezone(''utc'', now())
);

create unique index if not exists subscriptions_user_id_unique on public.subscriptions(user_id);
create index if not exists subscriptions_user_updated_idx on public.subscriptions(user_id, updated_at desc);

drop trigger if exists subscriptions_set_updated_at on public.subscriptions;
create trigger subscriptions_set_updated_at
before update on public.subscriptions
for each row execute function public.handle_updated_at();

alter table public.subscriptions enable row level security;

create policy if not exists "Subscriptions select own" on public.subscriptions
  for select
  using (auth.uid() = user_id);

create policy if not exists "Subscriptions insert own" on public.subscriptions
  for insert
  with check (auth.uid() = user_id);

create policy if not exists "Subscriptions update own" on public.subscriptions
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy if not exists "Subscriptions delete own" on public.subscriptions
  for delete
  using (auth.uid() = user_id);
