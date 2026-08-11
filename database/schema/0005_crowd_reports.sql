-- 0005_crowd_reports.sql
-- Module #12 — Crowd-Sourced Incident Reporting.
-- Community reports (harassment/theft/assault/stalking/suspicious person/unsafe location)
-- with optional photo/video attachments and GPS. Reports are readable by every authenticated
-- user (it's a public safety feed) — the edge function strips `user_id` from feed responses so
-- the reporter stays anonymous to other users; only the reporter (and admins, via is_admin())
-- ever sees their own identity attached to a report.
--
-- Standalone — apply after 0001_core.sql (needs `public.profiles` + `public.is_admin()`).
-- Not folded into database/setup.sql, which is generated for modules #17/#20 only.
--   Supabase SQL editor: paste this file and run.
--   Or: psql "$DATABASE_URL" -f database/schema/0001_core.sql -f database/schema/0005_crowd_reports.sql

-- ---------- enums ----------
do $$ begin
  create type public.report_type as enum (
    'harassment', 'theft', 'assault', 'stalking', 'suspicious_person', 'unsafe_location'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.report_status as enum ('pending', 'reviewed', 'resolved');
exception when duplicate_object then null; end $$;

-- ---------- crowd_reports ----------
create table if not exists public.crowd_reports (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  report_type public.report_type not null,
  description text,
  lat         double precision not null,
  lng         double precision not null,
  address     text,
  media       jsonb not null default '[]'::jsonb,   -- [{ url, type: 'photo' | 'video' }]
  status      public.report_status not null default 'pending',
  created_at  timestamptz not null default now()
);
create index if not exists crowd_reports_location_idx   on public.crowd_reports (lat, lng);
create index if not exists crowd_reports_created_at_idx on public.crowd_reports (created_at desc);
create index if not exists crowd_reports_user_idx       on public.crowd_reports (user_id);

-- ---------- RLS: crowd_reports ----------
alter table public.crowd_reports enable row level security;

-- Public/crowd feed by design — any authenticated user can read all reports (same pattern as
-- hotspots_read in 0001_core.sql). Anonymization (hiding user_id) is enforced by the edge
-- function response shape, not by RLS.
drop policy if exists crowd_reports_read on public.crowd_reports;
create policy crowd_reports_read on public.crowd_reports
  for select using (auth.role() = 'authenticated');

drop policy if exists crowd_reports_owner_insert on public.crowd_reports;
create policy crowd_reports_owner_insert on public.crowd_reports
  for insert with check (auth.uid() = user_id);

-- ---------- Storage bucket + object RLS ----------
-- Public bucket (unlike the private per-user `evidence` bucket) — report photos/videos must be
-- viewable by everyone browsing the community feed, not just the reporter.
insert into storage.buckets (id, name, public)
values ('crowd-report-media', 'crowd-report-media', true)
on conflict (id) do nothing;

drop policy if exists crowd_report_media_read on storage.objects;
create policy crowd_report_media_read on storage.objects
  for select using (bucket_id = 'crowd-report-media');

drop policy if exists crowd_report_media_write on storage.objects;
create policy crowd_report_media_write on storage.objects
  for insert with check (
    bucket_id = 'crowd-report-media' and (storage.foldername(name))[1] = auth.uid()::text
  );
