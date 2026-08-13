-- Schema for Emergency Incident Timeline Microservice (Module 19) in Supabase
-- Keyed by firebase_uid, not a users(id) FK: authentication-service/user-service
-- don't populate public.users yet, and this module must not block on that.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. sos_incidents: one row per SOS incident (device-generated client_incident_id
--    is the idempotency key for upserts from the mobile app).
CREATE TABLE IF NOT EXISTS public.sos_incidents (
  id UUID NOT NULL DEFAULT uuid_generate_v4(),
  client_incident_id VARCHAR(255) NOT NULL,
  firebase_uid TEXT NOT NULL,
  source VARCHAR(20) NOT NULL DEFAULT 'BUTTON',
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ended_at TIMESTAMP WITH TIME ZONE,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  location_accurate BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT sos_incidents_pkey PRIMARY KEY (id)
);

CREATE UNIQUE INDEX IF NOT EXISTS sos_incidents_client_incident_id_key ON public.sos_incidents (client_incident_id);
CREATE INDEX IF NOT EXISTS idx_sos_incidents_firebase_uid ON public.sos_incidents (firebase_uid);

-- 2. incident_timeline: append-only log of pipeline steps
--    (SOS_TRIGGERED, LOCATION_ACQUIRED, SMS_SENT, SMS_SKIPPED, CALL_PLACED,
--     LIVE_TRACKING_STARTED, LIVE_TRACKING_FAILED, LOCATION_UPDATE, SOS_ENDED).
CREATE TABLE IF NOT EXISTS public.incident_timeline (
  id UUID NOT NULL DEFAULT uuid_generate_v4(),
  incident_id UUID NOT NULL,
  step VARCHAR(50) NOT NULL,
  metadata JSONB,
  occurred_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT incident_timeline_pkey PRIMARY KEY (id),
  CONSTRAINT incident_timeline_incident_id_fkey FOREIGN KEY (incident_id)
    REFERENCES public.sos_incidents(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_incident_timeline_incident_id ON public.incident_timeline (incident_id);

-- 3. location_history: GPS breadcrumb trail, split out from the generic
--    timeline so a map/route view can query it directly without JSON filtering.
CREATE TABLE IF NOT EXISTS public.location_history (
  id UUID NOT NULL DEFAULT uuid_generate_v4(),
  incident_id UUID NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  accurate BOOLEAN DEFAULT true,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL,
  CONSTRAINT location_history_pkey PRIMARY KEY (id),
  CONSTRAINT location_history_incident_id_fkey FOREIGN KEY (incident_id)
    REFERENCES public.sos_incidents(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_location_history_incident_id ON public.location_history (incident_id);

-- 4. contacts_notified: which emergency contacts got an SMS/call for this incident.
CREATE TABLE IF NOT EXISTS public.contacts_notified (
  id UUID NOT NULL DEFAULT uuid_generate_v4(),
  incident_id UUID NOT NULL,
  phone VARCHAR(50) NOT NULL,
  sms_sent BOOLEAN DEFAULT false,
  call_placed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT contacts_notified_pkey PRIMARY KEY (id),
  CONSTRAINT contacts_notified_incident_id_fkey FOREIGN KEY (incident_id)
    REFERENCES public.sos_incidents(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS contacts_notified_incident_phone_key ON public.contacts_notified (incident_id, phone);

-- Enable RLS
ALTER TABLE public.sos_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts_notified ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (writes come from the backend service, not the client)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'sos_incidents' AND policyname = 'Service role full access to sos_incidents'
  ) THEN
    CREATE POLICY "Service role full access to sos_incidents" ON public.sos_incidents FOR ALL USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'incident_timeline' AND policyname = 'Service role full access to incident_timeline'
  ) THEN
    CREATE POLICY "Service role full access to incident_timeline" ON public.incident_timeline FOR ALL USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'location_history' AND policyname = 'Service role full access to location_history'
  ) THEN
    CREATE POLICY "Service role full access to location_history" ON public.location_history FOR ALL USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'contacts_notified' AND policyname = 'Service role full access to contacts_notified'
  ) THEN
    CREATE POLICY "Service role full access to contacts_notified" ON public.contacts_notified FOR ALL USING (true);
  END IF;
END $$;
