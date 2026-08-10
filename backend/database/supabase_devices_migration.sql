-- Run this in the Supabase SQL Editor for your project.
-- Extends the existing public.devices table for FCM device registration.
-- Safe to run once; uses IF NOT EXISTS / conditional checks so re-running won't error.

ALTER TABLE public.devices
  ADD COLUMN IF NOT EXISTS device_id character varying,
  ADD COLUMN IF NOT EXISTS firebase_uid text,
  ADD COLUMN IF NOT EXISTS manufacturer character varying,
  ADD COLUMN IF NOT EXISTS app_version character varying,
  ADD COLUMN IF NOT EXISTS notification_enabled boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- TEMPORARY: user_id is being relaxed because there's no auth/user-creation flow yet.
-- Devices registered while this is nullable have NO real owning user in `users`.
-- Once auth exists, backfill devices.user_id for every row and consider restoring
-- `NOT NULL` on this column so it can never silently happen again.
ALTER TABLE public.devices ALTER COLUMN user_id DROP NOT NULL;

-- device_id uniquely identifies a device install - required for upsert-by-device logic.
CREATE UNIQUE INDEX IF NOT EXISTS devices_device_id_key ON public.devices (device_id);
