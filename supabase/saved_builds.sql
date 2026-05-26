create extension if not exists "pgcrypto";

create table if not exists public.saved_builds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  prompt text not null,
  original_image text,
  result_image text not null,
  vehicle_label text,
  vehicle_form jsonb not null default '{}'::jsonb,
  builder_snapshot jsonb not null default '{}'::jsonb,
  part_finder_results jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.saved_builds
  add column if not exists vehicle_label text;

alter table public.saved_builds
  add column if not exists vehicle_form jsonb not null default '{}'::jsonb;

alter table public.saved_builds
  add column if not exists builder_snapshot jsonb not null default '{}'::jsonb;

alter table public.saved_builds
  add column if not exists part_finder_results jsonb not null default '[]'::jsonb;

create index if not exists saved_builds_user_id_created_at_idx
  on public.saved_builds (user_id, created_at desc);

alter table public.saved_builds enable row level security;

drop policy if exists "Users can view their own saved builds" on public.saved_builds;
create policy "Users can view their own saved builds"
on public.saved_builds
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own saved builds" on public.saved_builds;
create policy "Users can insert their own saved builds"
on public.saved_builds
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own saved builds" on public.saved_builds;
create policy "Users can delete their own saved builds"
on public.saved_builds
for delete
to authenticated
using (auth.uid() = user_id);
