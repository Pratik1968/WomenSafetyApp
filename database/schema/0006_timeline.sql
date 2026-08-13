-- 0006_timeline.sql
-- Module #19 — Incident Timeline Schema
-- Aggregates pipeline events (SOS, GPS, Audio, Video, AI Risk, Contacts, Resolutions)
-- for an emergency incident. Accessible to incident owners and administrators.

CREATE TABLE IF NOT EXISTS public.incident_timeline (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id  UUID NOT NULL REFERENCES public.incidents (id) ON DELETE CASCADE,
  event_type   TEXT NOT NULL,
  title        TEXT NOT NULL,
  description  TEXT,
  metadata     JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Performance index: fast retrieval of events for a given incident ordered chronologically
CREATE INDEX IF NOT EXISTS incident_timeline_incident_idx ON public.incident_timeline (incident_id, created_at ASC);

-- Row Level Security (RLS)
ALTER TABLE public.incident_timeline ENABLE ROW LEVEL SECURITY;

-- Owner select policy: user can only view events for their own incidents (or admin)
DROP POLICY IF EXISTS incident_timeline_owner_select ON public.incident_timeline;
CREATE POLICY incident_timeline_owner_select ON public.incident_timeline
  FOR SELECT USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.incidents i
      WHERE i.id = incident_id AND i.user_id = auth.uid()
    )
  );

-- Owner insert policy: user can append events to their own incidents (or admin)
DROP POLICY IF EXISTS incident_timeline_owner_insert ON public.incident_timeline;
CREATE POLICY incident_timeline_owner_insert ON public.incident_timeline
  FOR INSERT WITH CHECK (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.incidents i
      WHERE i.id = incident_id AND i.user_id = auth.uid()
    )
  );
