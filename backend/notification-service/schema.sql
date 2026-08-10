-- Schema for Notification Microservice & Devices in Supabase

-- 1. Enable UUID Extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create public.devices table (for FCM tokens & device metadata)
CREATE TABLE IF NOT EXISTS public.devices (
  id UUID NOT NULL DEFAULT uuid_generate_v4(),
  user_id UUID,
  device_id VARCHAR(255),
  firebase_uid TEXT,
  device_name VARCHAR(255),
  device_model VARCHAR(255),
  manufacturer VARCHAR(255),
  platform VARCHAR(50),
  os_version VARCHAR(50),
  app_version VARCHAR(50),
  fcm_token TEXT,
  notification_enabled BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT devices_pkey PRIMARY KEY (id)
);

CREATE UNIQUE INDEX IF NOT EXISTS devices_fcm_token_key ON public.devices (fcm_token);
CREATE INDEX IF NOT EXISTS idx_devices_user_id ON public.devices (user_id);
CREATE INDEX IF NOT EXISTS idx_devices_firebase_uid ON public.devices (firebase_uid);
CREATE INDEX IF NOT EXISTS idx_devices_device_id ON public.devices (device_id);

-- 3. Create public.notifications table (for push notification audit log)
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID NOT NULL DEFAULT uuid_generate_v4(),
  incident_id UUID,
  user_id UUID,
  recipient_name VARCHAR(255),
  recipient_phone VARCHAR(50),
  recipient_email VARCHAR(255),
  notification_type VARCHAR(50) DEFAULT 'SOS_ALERT',
  status VARCHAR(50) DEFAULT 'SENT',
  title TEXT,
  body TEXT,
  message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT notifications_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_incident_id ON public.notifications (incident_id);

-- Enable RLS
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'devices' AND policyname = 'Service role full access to devices'
  ) THEN
    CREATE POLICY "Service role full access to devices" ON public.devices FOR ALL USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'Service role full access to notifications'
  ) THEN
    CREATE POLICY "Service role full access to notifications" ON public.notifications FOR ALL USING (true);
  END IF;
END $$;
