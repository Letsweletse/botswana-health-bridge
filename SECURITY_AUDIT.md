# Security Audit — ChekaMeds / Botswana Health Bridge

Audit date: 2026-06-24

## Bottom line

This site is **not safe to treat as fully production-ready for sensitive patient data yet**. The repository has useful security controls already, especially Supabase RLS on key tables and backend-only service-role use, but I found issues that could expose data or allow abuse if deployed without tightening.

## What is already good

- Supabase service-role keys are used only in backend/server contexts, not in React frontend code.
- Public frontend Supabase keys are limited to `VITE_` publishable/anon style variables.
- Core database tables have Row Level Security enabled in migrations.
- Inventory writes are restricted to authenticated users for their own clinic or admins in the later RLS policies.
- Consultant video-room creation requires a bearer token and checks the logged-in user before using the service-role key.
- WhatsApp and AI Edge Functions keep provider tokens in environment variables.

## Findings

### Critical / high priority

1. **`.env` was tracked in git.**
   Even when it currently contains publishable Supabase values, tracking environment files is unsafe because real secrets can be accidentally committed later. I updated `.gitignore` so `.env` and `.env.*` are ignored, while allowing `.env.example`.

2. **Consultant request RLS had a policy bug.**
   The latest consultant request migration called `public.has_role('admin', auth.uid())` with the arguments reversed, and matched `profiles.id = auth.uid()` even though the schema stores the auth user in `profiles.user_id`. That can break admin access or facility request isolation depending on the deployed migration state. I added a corrective migration that uses `private.has_role(auth.uid(), 'admin')` and `profiles.user_id = auth.uid()`.

3. **The WhatsApp bot preview had an XSS risk.**
   `WhatsAppPanel` used `dangerouslySetInnerHTML` after formatting bot text. If untrusted text made it into the bot reply, a malicious message could render HTML/script in the browser preview. I added HTML escaping before applying the small WhatsApp-style bold/italic formatting.

### Medium priority

4. **Public webhook endpoint has no shared-secret verification.**
   `whatsapp-webhook` has `verify_jwt = false`, which is often necessary for UltraMsg webhooks, but it means anyone who knows the URL can POST test/incoming messages. Add a webhook secret header or token check if UltraMsg supports it, and rate-limit requests.

5. **Admin pages rely heavily on client-side checks.**
   The database RLS is the real protection, but `/admin` and `/admin/whatsapp` are routable from the browser. Keep RLS strict and consider wrapping admin pages in a dedicated `AdminRoute` for clearer UX.

6. **Video rooms are created as Daily.co `privacy: public`.**
   The room names are random and expire after two hours, but anyone with the link can join while active. For real consultations, private rooms/meeting tokens are safer.

7. **Public inventory read is intentional but broad.**
   `clinic_inventory` is public-readable. That is fine for a medicine availability search product, but do not store patient names, phone numbers, prescriptions, or private clinic operational notes in public-readable inventory fields.

### Data theft risk answer

- **Can someone steal patient data right now from the frontend alone?** Not directly from code alone if RLS is deployed correctly and no secrets are exposed.
- **Can people see sensitive operational/admin data if RLS is wrong?** Yes. Consultant requests and webhook logs are the tables to protect most carefully.
- **Can attackers spam or abuse the WhatsApp webhook?** Yes, because it is public by design and currently does not verify a shared webhook secret.
- **Should real patient personal/medical data be stored yet?** Not until the RLS fixes are applied, webhook verification/rate limiting is added, and production Supabase policies are reviewed in the live dashboard.

## Immediate recommendations before launch

1. Rotate any key that was ever committed if it was more than a publishable anon key.
2. Apply the new RLS migration to Supabase.
3. Add webhook shared-secret validation for UltraMsg requests.
4. Keep service-role keys only in Supabase Edge Functions or serverless API routes.
5. Do not store patient names/IDs/medical details in public-readable tables.
6. Review live Supabase policies in the dashboard after migrations run.
