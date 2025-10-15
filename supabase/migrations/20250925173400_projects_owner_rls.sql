create extension if not exists "pgcrypto";

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists projects_owner_id_idx on public.projects(owner_id);
create index if not exists projects_owner_created_at_idx on public.projects(owner_id, created_at desc);

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists projects_set_updated_at on public.projects;

create trigger projects_set_updated_at
before update on public.projects
for each row execute function public.handle_updated_at();

alter table public.projects enable row level security;

create policy if not exists "Users can select their projects" on public.projects
  for select
  using (auth.uid() = owner_id);

create policy if not exists "Users can insert their projects" on public.projects
  for insert
  with check (auth.uid() = owner_id);

create policy if not exists "Users can update their projects" on public.projects
  for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy if not exists "Users can delete their projects" on public.projects
  for delete
  using (auth.uid() = owner_id);
