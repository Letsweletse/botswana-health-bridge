-- Lock consultant request access by assigned facility.
-- Admins can view/update all requests. Facility users can only view/update requests assigned to their profile clinic_name.

alter table public.consultant_requests
  add column if not exists consultation_mode text default 'home',
  add column if not exists preferred_facility_name text,
  add column if not exists assigned_facility_name text;

update public.consultant_requests
set assigned_facility_name = coalesce(assigned_facility_name, preferred_facility_name, 'ChekaMeds Admin')
where assigned_facility_name is null;

create index if not exists consultant_requests_assigned_facility_name_idx
  on public.consultant_requests(assigned_facility_name);

alter table public.consultant_requests enable row level security;

drop policy if exists "Authenticated facility users can view consultant requests" on public.consultant_requests;
drop policy if exists "Authenticated facility users can update consultant requests" on public.consultant_requests;

do $$ begin
  create policy "Patients can submit consultant requests"
    on public.consultant_requests for insert
    with check (true);
exception when duplicate_object then null; end $$;

create policy "Admins can view all consultant requests"
  on public.consultant_requests for select
  using (public.has_role(auth.uid(), 'admin'));

create policy "Assigned facilities can view own consultant requests"
  on public.consultant_requests for select
  using (
    exists (
      select 1
      from public.profiles p
      where (p.user_id = auth.uid() or p.id = auth.uid())
        and p.approved = true
        and p.clinic_name = consultant_requests.assigned_facility_name
    )
  );

create policy "Admins can update all consultant requests"
  on public.consultant_requests for update
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create policy "Assigned facilities can update own consultant requests"
  on public.consultant_requests for update
  using (
    exists (
      select 1
      from public.profiles p
      where (p.user_id = auth.uid() or p.id = auth.uid())
        and p.approved = true
        and p.clinic_name = consultant_requests.assigned_facility_name
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where (p.user_id = auth.uid() or p.id = auth.uid())
        and p.approved = true
        and p.clinic_name = consultant_requests.assigned_facility_name
    )
  );
