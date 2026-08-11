-- Add app password support to public.users (run once in Supabase SQL editor)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS password_hash text;

COMMENT ON COLUMN public.users.password_hash IS 'PBKDF2 hash for app password login (set from mobile Settings after Phone OTP)';
