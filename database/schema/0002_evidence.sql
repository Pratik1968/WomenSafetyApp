-- 0002_evidence.sql
-- Module #17 — Cloud Evidence Storage.
-- Encrypted audio/video/image/GPS/log evidence, tamper-proof metadata, and a secure-retrieval
-- audit trail. Binary files live in the private Storage bucket `evidence`; this table holds the
-- metadata. Apply after 0001_core.sql.

-- ---------- evidence ----------
create table if not exists public.evidence (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles (id) on delete cascade,
  incident_id      uuid references public.incidents (id) on delete set null,
  type             public.evidence_type not null,
  storage_bucket   text not null default 'evidence',
  storage_path     text not null,                       -- '<user_id>/<uuid>.<ext>'
  file_name        text,
  mime_type        text,
  size_bytes       bigint not null default 0,
  duration_seconds int,                                 -- audio/video only
  checksum_sha256  text,                                -- integrity hash of the ciphertext
  is_encrypted     boolean not null default true,
  encryption_algo  text not null default 'AES-256-GCM',
  tamper_seal      text,                                -- signature / hash-chain seal
  status           text not null default 'ready',       -- pending | ready
  captured_at      timestamptz,
  uploaded_at      timestamptz not null default now(),
  created_at       timestamptz not null default now(),
  metadata         jsonb not null default '{}'::jsonb
);
create index if not exists evidence_user_idx     on public.evidence (user_id, created_at desc);
create index if not exists evidence_incident_idx on public.evidence (incident_id);
create index if not exists evidence_type_idx     on public.evidence (type);

-- ---------- evidence_access_log ----------
-- Every view/download/retrieve/delete is recorded — this is what makes retrieval "secure &
-- auditable" and supports legal chain-of-custody.
create table if not exists public.evidence_access_log (
  id                    uuid primary key default gen_random_uuid(),
  evidence_id           uuid not null references public.evidence (id) on delete cascade,
  accessed_by           uuid references public.profiles (id) on delete set null,
  action                text not null,                  -- view | download | retrieve | delete | upload
  signed_url_expires_at timestamptz,
  accessed_at           timestamptz not null default now(),
  ip                    text
);
create index if not exists evidence_access_evidence_idx on public.evidence_access_log (evidence_id, accessed_at desc);

-- ---------- RLS: evidence ----------
alter table public.evidence enable row level security;

drop policy if exists evidence_owner_select on public.evidence;
create policy evidence_owner_select on public.evidence
  for select using (auth.uid() = user_id or public.is_admin());

drop policy if exists evidence_owner_insert on public.evidence;
create policy evidence_owner_insert on public.evidence
  for insert with check (auth.uid() = user_id);

drop policy if exists evidence_owner_update on public.evidence;
create policy evidence_owner_update on public.evidence
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists evidence_owner_delete on public.evidence;
create policy evidence_owner_delete on public.evidence
  for delete using (auth.uid() = user_id or public.is_admin());

-- ---------- RLS: evidence_access_log ----------
alter table public.evidence_access_log enable row level security;

drop policy if exists evidence_log_read on public.evidence_access_log;
create policy evidence_log_read on public.evidence_access_log
  for select using (
    public.is_admin()
    or exists (select 1 from public.evidence e where e.id = evidence_id and e.user_id = auth.uid())
  );

drop policy if exists evidence_log_insert on public.evidence_access_log;
create policy evidence_log_insert on public.evidence_access_log
  for insert with check (
    accessed_by = auth.uid()
    and exists (select 1 from public.evidence e where e.id = evidence_id and (e.user_id = auth.uid() or public.is_admin()))
  );

-- ---------- Storage bucket + object RLS ----------
-- Private bucket; each user's files live under a folder named after their uuid.
insert into storage.buckets (id, name, public)
values ('evidence', 'evidence', false)
on conflict (id) do nothing;

drop policy if exists evidence_objects_read on storage.objects;
create policy evidence_objects_read on storage.objects
  for select using (
    bucket_id = 'evidence'
    and (public.is_admin() or (storage.foldername(name))[1] = auth.uid()::text)
  );

drop policy if exists evidence_objects_write on storage.objects;
create policy evidence_objects_write on storage.objects
  for insert with check (
    bucket_id = 'evidence' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists evidence_objects_delete on storage.objects;
create policy evidence_objects_delete on storage.objects
  for delete using (
    bucket_id = 'evidence'
    and (public.is_admin() or (storage.foldername(name))[1] = auth.uid()::text)
  );
