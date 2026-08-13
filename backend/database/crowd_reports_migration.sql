-- Run this in the Supabase SQL Editor for your project.
-- Creates the table backing Module 12 (Crowd-Sourced Incident Reporting).
-- Safe to run once; uses IF NOT EXISTS so re-running won't error.

CREATE TABLE IF NOT EXISTS public.crowd_reports (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  report_type character varying NOT NULL,
  description text,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  address text,
  media jsonb NOT NULL DEFAULT '[]'::jsonb,
  status character varying NOT NULL DEFAULT 'PENDING',
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT crowd_reports_pkey PRIMARY KEY (id),
  CONSTRAINT crowd_reports_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT crowd_reports_report_type_check CHECK (
    report_type IN ('HARASSMENT', 'THEFT', 'ASSAULT', 'STALKING', 'SUSPICIOUS_PERSON', 'UNSAFE_LOCATION')
  ),
  CONSTRAINT crowd_reports_status_check CHECK (status IN ('PENDING', 'REVIEWED', 'RESOLVED'))
);

-- Nearby-reports lookups filter/sort by these; keeps the feed query cheap as the table grows.
CREATE INDEX IF NOT EXISTS crowd_reports_location_idx ON public.crowd_reports (latitude, longitude);
CREATE INDEX IF NOT EXISTS crowd_reports_created_at_idx ON public.crowd_reports (created_at DESC);

-- Storage bucket for report photos/videos (idempotent - see also the runtime
-- fallback in IncidentReportRepository._ensure_bucket, which creates this bucket
-- automatically on first upload if it doesn't exist yet).
INSERT INTO storage.buckets (id, name, public)
VALUES ('crowd-report-media', 'crowd-report-media', true)
ON CONFLICT (id) DO NOTHING;
