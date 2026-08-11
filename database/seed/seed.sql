-- seed.sql — demo data for modules #17 and #20.
--
-- Hotspots and health metrics have no auth dependency and are inserted directly.
-- Incidents/evidence are attributed to your FIRST profile row, so:
--   1) sign in once through the app (creates a profiles row), then
--   2) run this seed — it promotes that user to admin and attaches demo incidents + evidence.
-- Safe to run multiple times (uses stable keys / guards).

-- ---------- crime_hotspots ----------
insert into public.crime_hotspots (name, lat, lng, risk_level, incident_count) values
  ('100 Ft Road Rear Alley',   12.9719, 77.6412, 'hotspot',  14),
  ('Metro Station Exit 3',      12.9784, 77.6408, 'high',      9),
  ('5th Cross Underpass',       12.9345, 77.6260, 'high',      7),
  ('Lakeside Jogging Track',    12.9231, 77.6810, 'moderate',  4),
  ('Tech Park Service Road',    12.9560, 77.7010, 'moderate',  3),
  ('Central Market Square',     12.9760, 77.5990, 'low',       1)
on conflict do nothing;

-- ---------- app_health_metrics ----------
insert into public.app_health_metrics (service, metric, value, unit) values
  ('emergency-service',    'uptime',     99.98, '%'),
  ('emergency-service',    'latency_ms', 142,   'ms'),
  ('emergency-service',    'error_rate', 0.2,   '%'),
  ('gps-service',          'uptime',     99.90, '%'),
  ('gps-service',          'latency_ms', 88,    'ms'),
  ('ai-service',           'uptime',     99.40, '%'),
  ('ai-service',           'latency_ms', 310,   'ms'),
  ('notification-service', 'uptime',     99.95, '%'),
  ('user-service',         'uptime',     100.0, '%')
on conflict do nothing;

-- ---------- user-scoped demo data ----------
do $$
declare
  uid uuid;
  inc_sos uuid;
begin
  select id into uid from public.profiles order by created_at asc limit 1;
  if uid is null then
    raise notice 'No profiles yet. Sign in once via the app, then re-run seed.sql to attach incidents/evidence.';
    return;
  end if;

  -- promote first user to admin so the dashboard is reachable
  update public.profiles
     set is_admin = true,
         full_name = coalesce(full_name, 'Pratik (Admin)'),
         status = 'active',
         last_active_at = now()
   where id = uid;

  -- only seed incidents/evidence once
  if exists (select 1 from public.incidents where user_id = uid) then
    raise notice 'Incidents already seeded for %, skipping.', uid;
    return;
  end if;

  insert into public.incidents (user_id, type, status, severity, address, started_at, resolved_at, response_time_seconds)
  values
    (uid, 'sos',     'resolved',     78, '100 Ft Road underpass', now() - interval '3 days',  now() - interval '3 days'  + interval '4 min', 240),
    (uid, 'journey', 'resolved',     20, 'Indiranagar → Koramangala', now() - interval '6 days', now() - interval '6 days' + interval '35 min', 90),
    (uid, 'report',  'under_review', 55, '5th Cross stretch',     now() - interval '9 days',  null, null),
    (uid, 'alert',   'resolved',     40, 'Metro Station Exit 3',  now() - interval '12 days', now() - interval '12 days' + interval '2 min', 120),
    (uid, 'sos',     'cancelled',    30, 'Lakeside Track',        now() - interval '1 day',   now() - interval '1 day'   + interval '1 min', 60)
  returning id into inc_sos;

  insert into public.evidence
    (user_id, incident_id, type, storage_path, file_name, mime_type, size_bytes, duration_seconds, checksum_sha256, tamper_seal, captured_at)
  values
    (uid, inc_sos, 'audio',        uid || '/demo-audio-1.m4a',  'sos-audio.m4a', 'audio/mp4',        5242880,  522,  'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2', 'seal:9f2a…c7', now() - interval '3 days'),
    (uid, inc_sos, 'video',        uid || '/demo-video-1.mp4',  'sos-video.mp4', 'video/mp4',        41943040, 95,   'b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3', 'seal:1c8d…33', now() - interval '3 days'),
    (uid, inc_sos, 'image',        uid || '/demo-image-1.jpg',  'scene-1.jpg',   'image/jpeg',       1835008,  null, 'c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4', 'seal:77ef…a0', now() - interval '3 days'),
    (uid, null,    'gps_track',    uid || '/demo-track-1.json', 'route.json',    'application/json', 20480,    null, 'd4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5', 'seal:0b41…9e', now() - interval '6 days'),
    (uid, null,    'incident_log', uid || '/demo-log-1.json',   'timeline.json', 'application/json', 8192,     null, 'e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6', 'seal:5a2c…d1', now() - interval '9 days');
end $$;
