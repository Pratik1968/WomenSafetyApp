# Database — modules #17 & #20

Postgres/Supabase schema for **Cloud Evidence Storage (#17)** and the **Administrative Dashboard (#20)**.

## Files (apply in order)

| File | Purpose |
|---|---|
| `schema/0001_core.sql` | Shared enums + `profiles`, `incidents`, `crime_hotspots`, `app_health_metrics`, the `is_admin()` helper, the new-user trigger, and base RLS. |
| `schema/0002_evidence.sql` | `evidence` + `evidence_access_log`, the private `evidence` Storage bucket, and RLS (module #17). |
| `schema/0003_admin.sql` | Read views for KPIs / analytics / hotspots / health (module #20). |
| `seed/seed.sql` | Demo data. Promotes your first user to admin and attaches sample incidents + evidence. |

## Apply

**Supabase SQL editor** — paste each file in order and run.

**Or Supabase CLI:**
```bash
supabase db push        # if you've added these as migrations under supabase/migrations
# or, quick load:
psql "$DATABASE_URL" -f schema/0001_core.sql -f schema/0002_evidence.sql -f schema/0003_admin.sql -f seed/seed.sql
```

To reach the dashboard you must be an admin: sign in once via the app (creates a `profiles` row), then run `seed/seed.sql` (it flips your first user's `is_admin = true`), or manually:
```sql
update public.profiles set is_admin = true where id = '<your-user-id>';
```

## Data model (ER overview)

```
auth.users 1─1 profiles ──1─┐
                            ├─* incidents ──1─* evidence ──1─* evidence_access_log
                            └─* evidence
crime_hotspots      (standalone, admin-managed)   ┐
app_health_metrics  (standalone, service samples) ┘→ dashboard views (v_admin_overview,
                                                     v_incident_daily, v_incident_by_type,
                                                     v_hotspots, v_service_health)
```

- **`evidence`** holds metadata only; encrypted binaries live in the private `evidence` Storage bucket at `<user_id>/<file>`. Retrieval issues a short-lived signed URL and writes an `evidence_access_log` row (chain-of-custody).
- **RLS**: users see only their own `evidence`/`incidents`; `is_admin()` users can read across all for the dashboard.
- The dashboard **views** are consumed by `backend/user-service` (admin edge function); evidence CRUD by `backend/emergency-service`.

> `profiles`/`incidents`/`crime_hotspots` are created with `IF NOT EXISTS` so teammates' fuller definitions of these shared tables can supersede these minimal ones.
