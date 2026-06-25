-- Fix consultant request RLS helpers and profile ownership checks.
-- The previous policy used public.has_role with reversed arguments and matched
-- profiles.id to auth.uid(); this schema stores the auth user in profiles.user_id.

alter table public.consultant_requests enable row level security;

drop policy if exists "Admins can view all consultant requests" on public.consultant_requests;
drop policy if exists "Admins can update all consultant requests" on public.consultant_requests;
drop policy if exists "Assigned facilities can view own consultant requests" on public.consultant_requests;
drop policy if exists "Assigned facilities can update own consultant requests" on public.consultant_requests;

create policy "Admins can view all consultant requests"
  on public.consultant_requests for select
  using (private.has_role(auth.uid(), 'admin'::public.app_role));

create policy "Assigned facilities can view own consultant requests"
  on public.consultant_requests for select
  using (
    exists (
      select 1
      from public.profiles p
      where p.user_id = auth.uid()
        and p.approved = true
        and p.clinic_name = consultant_requests.assigned_facility_name
    )
  );

create policy "Admins can update all consultant requests"
  on public.consultant_requests for update
  using (private.has_role(auth.uid(), 'admin'::public.app_role))
  with check (private.has_role(auth.uid(), 'admin'::public.app_role));

create policy "Assigned facilities can update own consultant requests"
  on public.consultant_requests for update
  using (
    exists (
      select 1
      from public.profiles p
      where p.user_id = auth.uid()
        and p.approved = true
        and p.clinic_name = consultant_requests.assigned_facility_name
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.user_id = auth.uid()
        and p.approved = true
        and p.clinic_name = consultant_requests.assigned_facility_name
    )
  );
