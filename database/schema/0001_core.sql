-- 0001_core.sql
-- Shared/core schema for the AI-Enabled Women Security Application.
--
-- Modules #17 (Cloud Evidence Storage) and #20 (Administrative Dashboard) — owned by pratik —
-- read/write a few shared tables that other teammates' modules also touch. Those tables are
-- created here MINIMALLY and guarded with IF NOT EXISTS so a teammate's fuller definition can
-- supersede this one. Apply in Supabase SQL editor or via `supabase db push`.

create extension if not exists "pgcrypto";      -- gen_random_uuid()

-- ---------- enums ----------
do $$ begin
  create type public.evidence_type as enum ('audio', 'video', 'image', 'gps_track', 'incident_log');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.incident_type as enum ('sos', 'journey', 'report', 'alert');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.incident_status as enum ('active', 'resolved', 'under_review', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.risk_level as enum ('low', 'moderate', 'high', 'hotspot');
exception when duplicate_object then null; end $$;

-- ---------- profiles ----------
-- One row per auth user. `is_admin` gates the Administrative Dashboard (#20).
create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  full_name     text,
  phone         text,
  blood_group   text,
  is_admin      boolean not null default false,
  status        text not null default 'active',   -- active | suspended
  created_at    timestamptz not null default now(),
  last_active_at timestamptz
);

-- ---------- incidents ----------
-- SOS / journey / report / alert events. #20 aggregates these for analytics + response monitoring.
create table if not exists public.incidents (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid references public.profiles (id) on delete cascade,
  type                  public.incident_type not null,
  status                public.incident_status not null default 'active',
  severity              int not null default 0,          -- danger score 0..100
  lat                   double precision,
  lng                   double precision,
  address               text,
  started_at            timestamptz not null default now(),
  resolved_at           timestamptz,
  response_time_seconds int
);
create index if not exists incidents_user_idx    on public.incidents (user_id);
create index if not exists incidents_started_idx on public.incidents (started_at);

-- ---------- crime_hotspots ----------
-- Risk-zone points powering the dashboard heatmap (#20). Owned longer-term by module #11.
create table if not exists public.crime_hotspots (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  lat            double precision,
  lng            double precision,
  risk_level     public.risk_level not null default 'moderate',
  incident_count int not null default 0,
  updated_at     timestamptz not null default now()
);

-- ---------- app_health_metrics ----------
-- Backend/service health samples surfaced on the dashboard (#20).
create table if not exists public.app_health_metrics (
  id          uuid primary key default gen_random_uuid(),
  service     text not null,          -- e.g. 'emergency-service'
  metric      text not null,          -- e.g. 'uptime', 'latency_ms', 'error_rate'
  value       numeric not null,
  unit        text,                   -- '%', 'ms', ...
  recorded_at timestamptz not null default now()
);
create index if not exists app_health_service_idx on public.app_health_metrics (service, recorded_at);

-- ---------- helpers ----------
-- is_admin(): true when the current auth user has profiles.is_admin = true.
-- SECURITY DEFINER so it can be called from RLS policies without recursive checks.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select p.is_admin from public.profiles p where p.id = auth.uid()), false);
$$;

-- ---------- RLS: profiles ----------
alter table public.profiles enable row level security;

drop policy if exists profiles_self_select on public.profiles;
create policy profiles_self_select on public.profiles
  for select using (auth.uid() = id or public.is_admin());

drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles
  for update using (auth.uid() = id or public.is_admin());

drop policy if exists profiles_self_insert on public.profiles;
create policy profiles_self_insert on public.profiles
  for insert with check (auth.uid() = id);

-- Auto-create a profile row when a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (new.id, new.raw_user_meta_data ->> 'full_name', new.phone)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- RLS: incidents / hotspots / health (admin-readable) ----------
alter table public.incidents enable row level security;

drop policy if exists incidents_owner_all on public.incidents;
create policy incidents_owner_all on public.incidents
  for all using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id or public.is_admin());

alter table public.crime_hotspots enable row level security;
drop policy if exists hotspots_read on public.crime_hotspots;
create policy hotspots_read on public.crime_hotspots
  for select using (auth.role() = 'authenticated');
drop policy if exists hotspots_admin_write on public.crime_hotspots;
create policy hotspots_admin_write on public.crime_hotspots
  for all using (public.is_admin()) with check (public.is_admin());

alter table public.app_health_metrics enable row level security;
drop policy if exists health_admin_read on public.app_health_metrics;
create policy health_admin_read on public.app_health_metrics
  for select using (public.is_admin());
