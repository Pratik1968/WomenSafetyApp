-- Mock data for the Admin dashboard: Crime hotspots + Service health.
-- Safe to re-run (clears the two demo tables first, then repopulates).

-- ---------- crime_hotspots ----------
delete from public.crime_hotspots;
insert into public.crime_hotspots (name, lat, lng, risk_level, incident_count) values
  ('100 Ft Road Rear Alley',   12.9719, 77.6412, 'hotspot',  14),
  ('Metro Station Exit 3',      12.9784, 77.6408, 'high',      9),
  ('5th Cross Underpass',       12.9345, 77.6260, 'high',      7),
  ('Lakeside Jogging Track',    12.9231, 77.6810, 'moderate',  4),
  ('Tech Park Service Road',    12.9560, 77.7010, 'moderate',  3),
  ('Central Market Square',     12.9760, 77.5990, 'low',       1);

-- ---------- app_health_metrics ----------
delete from public.app_health_metrics;
insert into public.app_health_metrics (service, metric, value, unit) values
  ('emergency-service',    'uptime',     99.98, '%'),
  ('gps-service',          'uptime',     99.90, '%'),
  ('ai-service',           'uptime',     99.40, '%'),
  ('notification-service', 'uptime',     99.95, '%'),
  ('authentication-service','uptime',    99.99, '%'),
  ('user-service',         'uptime',    100.00, '%');
