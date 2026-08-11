# Supabase setup (modules #17 & #20)

End-to-end setup to run the Evidence Vault (#17, mobile) and Admin Dashboard (#20, web).

## 1. Create a project
1. Go to https://supabase.com → **New project**. Pick a name + strong DB password + region.
2. When it's ready, open **Project Settings → API** and copy:
   - **Project URL** (e.g. `https://abcd1234.supabase.co`)
   - **anon public** key
   - **Project ref** (the `abcd1234` part of the URL)

## 2. Apply the database schema
Open **SQL Editor → New query**, paste all of **`database/setup.sql`**, and **Run**.
This creates the tables, `is_admin()`, RLS policies, dashboard views, and the private `evidence` Storage bucket.

## 3. Enable anonymous sign-in
The app signs in anonymously so it has a session (the real login is another teammate's module).
**Authentication → Providers → Anonymous → Enable**, then Save.

## 4. Point the app at your project
```bash
cd frontend
cp .env.example .env
```
Edit `frontend/.env`:
```
EXPO_PUBLIC_SUPABASE_URL=https://<your-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

## 5. Deploy the edge functions
Evidence lives in `emergency-service`, admin in `user-service`.
```bash
# install CLI once: https://supabase.com/docs/guides/cli
supabase login
cd WomenSaftyApp
supabase init            # creates supabase/config.toml (needed by the CLI); accept defaults
SUPABASE_PROJECT_REF=<your-ref> ./deployment/deploy-functions.sh
```
The script stages each `backend/<service>/` and deploys it (create-or-update). The service-role key the admin function needs is injected by Supabase automatically — no extra config.

## 6. Become an admin + load demo data
1. Start the app (step 7) and open it once so a `profiles` row is created for your anonymous user.
2. In **SQL Editor**, run **`database/seed/seed.sql`** — it promotes your first user to admin and adds demo incidents, hotspots, health metrics, and evidence rows.
   (Or manually: `update public.profiles set is_admin = true;`)

## 7. Run the app
```bash
cd frontend
npx expo start          # mobile → Evidence Vault
npx expo start --web    # browser → Admin Dashboard (Admin tab appears on web)
```

## Notes
- **Demo evidence files**: `seed.sql` inserts evidence *rows* but no actual binaries, so "Retrieve securely" returns a valid signed URL that 404s when opened — the metadata/retrieval/audit flow still works. To test a real file, upload via the app's upload flow (uses `createSignedUploadUrl`).
- **Without setup**: the app still boots; screens just show error/empty states because the calls fail.
- **403 on the dashboard** means your user isn't admin yet — re-run step 6.
