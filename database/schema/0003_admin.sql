-- 0003_admin.sql
-- Module #20 — Administrative Dashboard read models.
-- Aggregate views for KPIs, incident analytics, hotspots, and storage usage. The user-service
-- edge function queries these with the service-role key AFTER verifying the caller is_admin().
-- Apply after 0001_core.sql and 0002_evidence.sql.

-- KPI overview (single row).
create or replace view public.v_admin_overview as
select
  (select count(*) from public.profiles)                                              as total_users,
  (select count(*) from public.profiles where last_active_at > now() - interval '7 days') as active_users_7d,
  (select count(*) from public.profiles where status = 'suspended')                   as suspended_users,
  (select count(*) from public.incidents)                                             as total_incidents,
  (select count(*) from public.incidents where status = 'active')                     as active_incidents,
  (select coalesce(round(avg(response_time_seconds)), 0)
     from public.incidents where response_time_seconds is not null)                   as avg_response_seconds,
  (select count(*) from public.evidence)                                              as total_evidence,
  (select coalesce(sum(size_bytes), 0) from public.evidence)                          as storage_bytes_used;

-- Incidents per day for the last 30 days (time-series for the trend chart).
create or replace view public.v_incident_daily as
select
  d::date                                       as day,
  count(i.id)                                   as incident_count
from generate_series(
       (current_date - interval '29 days'),
       current_date,
       interval '1 day'
     ) as d
left join public.incidents i on i.started_at::date = d::date
group by d
order by d;

-- Incident counts grouped by type (bar chart).
create or replace view public.v_incident_by_type as
select type::text as type, count(*) as incident_count
from public.incidents
group by type
order by incident_count desc;

-- Hotspots ordered by risk for the heatmap + top-zone list.
create or replace view public.v_hotspots as
select id, name, lat, lng, risk_level::text as risk_level, incident_count, updated_at
from public.crime_hotspots
order by incident_count desc, updated_at desc;

-- Latest health sample per service+metric (dashboard health panel).
create or replace view public.v_service_health as
select distinct on (service, metric)
  service, metric, value, unit, recorded_at
from public.app_health_metrics
order by service, metric, recorded_at desc;

-- Views run with the querying role's privileges; the edge function enforces admin-only access,
-- and RLS on the base tables (0001/0002) already restricts non-admins.
