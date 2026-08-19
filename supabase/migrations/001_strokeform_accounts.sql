-- Strokeform account storage: profile row + game snapshot (player profile + gear bag).
-- Run in Supabase SQL editor or via supabase db push.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name text not null default '',
  last_name text not null default '',
  email text not null,
  newsletter_opt_in boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.player_snapshots (
  user_id uuid primary key references auth.users (id) on delete cascade,
  player_profile jsonb not null default '{}'::jsonb,
  gear_setup jsonb not null default '{}'::jsonb,
  onboarding_complete boolean not null default false,
  onboarding_step integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.player_snapshots enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

create policy "snapshots_select_own"
  on public.player_snapshots for select
  using (auth.uid() = user_id);

create policy "snapshots_insert_own"
  on public.player_snapshots for insert
  with check (auth.uid() = user_id);

create policy "snapshots_update_own"
  on public.player_snapshots for update
  using (auth.uid() = user_id);

-- Auto-create profile row when a user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, first_name, last_name, newsletter_opt_in)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', ''),
    coalesce((new.raw_user_meta_data->>'newsletter_opt_in')::boolean, false)
  );
  insert into public.player_snapshots (user_id)
  values (new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
