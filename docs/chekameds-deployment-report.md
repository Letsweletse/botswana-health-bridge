# ChekaMeds Stabilization Deployment Report

Branch: `stabilize-chekameds-production`


## Target Supabase project

- Project ref: `kcgsxxwgzrmsnnxvpkvi`
- Frontend URL: `https://kcgsxxwgzrmsnnxvpkvi.supabase.co`
- Do not use any previous Supabase project ref for frontend builds, Supabase CLI deploys, or hosting environment variables.

## Pre-deploy confirmations

- Migrations are prepared in `supabase/migrations/20260514000000_stabilize_chekameds_launch.sql` and `supabase/migrations/20260514010000_admin_management.sql`.
- `chekapay-webhook` is configured with `verify_jwt = false` in `supabase/config.toml`.
- WhatsApp and ChekaPay functions read service-role credentials only from server-side `Deno.env`; no service-role key is referenced in frontend code.
- WhatsApp `PAY` uses a manual collection fallback until ChekaPay checkout is fully active.
- Inferred directions links are only generated for `South West Pharma`; other pharmacies need a configured `directions_link`.

## Prepared deployment scope

### Migrations

1. `20260514000000_stabilize_chekameds_launch.sql`
   - Adds `directions_link` to inventory.
   - Adds WhatsApp session language persistence.
   - Adds ChekaPay webhook event storage.
   - Adds search/session indexes.
2. `20260514010000_admin_management.sql`
   - Adds admin profile support.
   - Adds pharmacy lifecycle/status/subscription/visibility fields.
   - Adds active public inventory view.
   - Adds order request and failed search tables.
   - Tightens RLS so public users only see active, visible pharmacy inventory.
   - Promotes `iblimenterprise@zohomail.com` to admin if that Supabase Auth user already exists.
3. `20260514020000_registration_approval_fix.sql`
   - Ensures new facility signups become pending profile/pharmacy records.
   - Lets admins approve directly from the database by setting `public.profiles.approved = true`.
   - Syncs approved profiles to active, visible pharmacy rows automatically.
4. `20260514030000_auth_user_profile_backfill.sql`
   - Backfills existing Supabase Auth users into `profiles` and `pharmacies`.
   - Fixes the admin issue where Auth reports more users than the admin dashboard can see.
5. `20260514040000_registration_trigger_hardening.sql`
   - Recreates the Auth signup trigger so every new signup becomes a pending profile/pharmacy row immediately.
   - Adds `approve_pharmacy_by_name()` as an admin-only helper; direct `profiles.approved = true` updates still work.

### Edge Functions

Deploy these functions after migrations are applied:

```bash
supabase functions deploy whatsapp-webhook
supabase functions deploy chekapay-webhook
supabase functions deploy admin-sync-users
```

## Required secrets / environment variables

Server-side Supabase Edge Function secrets:

- `SUPABASE_URL=https://kcgsxxwgzrmsnnxvpkvi.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ULTRAMSG_INSTANCE_ID`
- `ULTRAMSG_TOKEN`
- `CHEKAPAY_WEBHOOK_SECRET`
- `RESEND_API_KEY`
- `LOVABLE_API_KEY`

Admin-only Edge Function:

- `admin-sync-users` uses `SUPABASE_SERVICE_ROLE_KEY` server-side to list Auth users and create missing pending profile/pharmacy rows. It still requires the caller to be an authenticated admin.

Frontend build variables:

- `VITE_SUPABASE_URL=https://kcgsxxwgzrmsnnxvpkvi.supabase.co`
- `VITE_SUPABASE_PROJECT_ID=kcgsxxwgzrmsnnxvpkvi`
- `VITE_SUPABASE_PUBLISHABLE_KEY` from the `kcgsxxwgzrmsnnxvpkvi` Supabase project settings

## Admin access setup steps

Do not hardcode an admin password.

1. Create or invite `iblimenterprise@zohomail.com` in Supabase Auth using the Supabase Dashboard or secure invite flow.
2. Apply migrations.
3. If the Auth user existed before migrations, the migration promotes it automatically in `user_roles` and `admin_profiles`.
4. If the Auth user is created after migrations, run this SQL manually in Supabase SQL editor:

```sql
insert into public.user_roles (user_id, role)
select id, 'admin'::public.app_role
from auth.users
where lower(email) = 'iblimenterprise@zohomail.com'
on conflict (user_id, role) do nothing;

insert into public.admin_profiles (user_id, email)
select id, 'iblimenterprise@zohomail.com'
from auth.users
where lower(email) = 'iblimenterprise@zohomail.com'
on conflict (user_id) do nothing;
```

## Safe deployment plan

1. Review and merge the PR into the deployment branch only after approval.
2. Confirm the Supabase CLI is linked to `kcgsxxwgzrmsnnxvpkvi` and hosting env vars use `VITE_SUPABASE_URL=https://kcgsxxwgzrmsnnxvpkvi.supabase.co` plus `VITE_SUPABASE_PROJECT_ID=kcgsxxwgzrmsnnxvpkvi`.
3. Confirm secrets with `supabase secrets list`.
4. Apply migrations with the Supabase CLI or dashboard migration flow.
5. Deploy `whatsapp-webhook`.
6. Deploy `chekapay-webhook`.
7. Deploy `admin-sync-users`.
8. Rebuild/redeploy the frontend with the new project env vars.
9. Open `/admin` and click **Sync signups** if Supabase Auth shows more users than the dashboard.
10. Smoke-test:
   - New pharmacy registration completes even if notification email delivery fails.
   - Pending facilities can sign in and see the approval-pending page.
   - Updating `public.profiles.approved = true` or running `select public.approve_pharmacy_by_name('Exact Facility Name')` activates the matching pharmacy for admin/database approval.
   - Public `/search` only returns active and visible pharmacies.
   - WhatsApp medicine search returns selectable options 1-5.
   - WhatsApp `PAY` creates an order request and returns manual collection wording.
   - Suspended/frozen pharmacies disappear from search.
   - Admin dashboard can view facilities, inventory, order requests, WhatsApp logs/sessions, ChekaPay events, and failed searches.

## Remaining manual tasks / risks

- Actual production migration application and Edge Function deployment require Supabase project credentials and were not run from this repository-only environment.
- End-to-end UltraMsg WhatsApp and ChekaPay webhook tests require live provider credentials.
- If `iblimenterprise@zohomail.com` does not exist in Supabase Auth when migrations run, create/invite the user and run the manual SQL above.
- If a facility says they cannot access the dashboard, check Supabase Auth email confirmation first, click **Sync signups** in `/admin`, then approve them by setting `public.profiles.approved = true` for their `clinic_name` or `user_id`.
- Lockfile drift still blocks `npm ci`; refresh `package-lock.json` in a controlled dependency update before relying on CI installs.
