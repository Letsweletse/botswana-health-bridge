-- public.pharmacies has RLS enabled but had zero policies, so every insert
-- from the pharmacy registration flow (Register.tsx) was silently blocked.
-- Add the minimal policy needed: an authenticated user may insert their own
-- pharmacy row (user_id = auth.uid()). No existing policies are touched.

create policy "pharmacies_insert_own"
  on public.pharmacies for insert
  to authenticated
  with check (auth.uid() = user_id);
