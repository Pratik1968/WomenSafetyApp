-- 0004_admin_auth.sql
-- Custom admin authentication for the Administrative Dashboard (module #20).
--
-- Admins live in public.admin_users (id, email, password_hash, role admin_role_enum, is_active, …)
-- with a bcrypt password_hash produced by pgcrypto's crypt()/gen_salt('bf').
--
-- admin_login() verifies credentials IN-DB (SECURITY DEFINER) so the hash never leaves Postgres.
-- The user-service edge function calls it with the service-role key and, on a match, mints a signed
-- session token. Apply after admin_users exists.

create or replace function public.admin_login(p_email text, p_password text)
returns table (id uuid, full_name text, email text, role text)
language sql
security definer
set search_path = public, extensions
as $$
  select a.id, a.full_name::text, a.email::text, a.role::text
  from public.admin_users a
  where a.email = lower(p_email)
    and a.is_active
    and a.password_hash = crypt(p_password, a.password_hash)
$$;

-- Only the service role (used by the edge function) may run this. Never expose it to the anon or
-- authenticated API roles — via PostgREST /rpc it would become an unauthenticated password oracle.
revoke all on function public.admin_login(text, text) from public, anon, authenticated;
grant execute on function public.admin_login(text, text) to service_role;
