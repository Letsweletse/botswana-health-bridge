alter table public.consultant_requests add column if not exists consultation_mode text default 'home';
alter table public.consultant_requests add column if not exists preferred_facility_name text;
alter table public.consultant_requests add column if not exists assigned_facility_name text;
alter table public.consultant_requests add column if not exists reviewed_by uuid;
alter table public.consultant_requests add column if not exists reviewed_at timestamptz;

create index if not exists consultant_requests_consultation_mode_idx on public.consultant_requests(consultation_mode);
create index if not exists consultant_requests_preferred_facility_name_idx on public.consultant_requests(preferred_facility_name);
create index if not exists consultant_requests_assigned_facility_name_idx on public.consultant_requests(assigned_facility_name);

drop policy if exists "Authenticated facility users can view consultant requests" on public.consultant_requests;
drop policy if exists "Authenticated facility users can update consultant requests" on public.consultant_requests;

do $$ begin
  create policy "Admin or assigned facility can view consultant requests"
    on public.consultant_requests for select
    using (
      auth.jwt() ->> 'email' = 'iblimenterprise@zohomail.com'
      or exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.approved = true
          and lower(p.clinic_name) in (
            lower(coalesce(assigned_facility_name, '')),
            lower(coalesce(preferred_facility_name, ''))
          )
      )
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Admin or assigned facility can update consultant requests"
    on public.consultant_requests for update
    using (
      auth.jwt() ->> 'email' = 'iblimenterprise@zohomail.com'
      or exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.approved = true
          and lower(p.clinic_name) in (
            lower(coalesce(assigned_facility_name, '')),
            lower(coalesce(preferred_facility_name, ''))
          )
      )
    )
    with check (
      auth.jwt() ->> 'email' = 'iblimenterprise@zohomail.com'
      or exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.approved = true
          and lower(p.clinic_name) in (
            lower(coalesce(assigned_facility_name, '')),
            lower(coalesce(preferred_facility_name, ''))
          )
      )
    );
exception when duplicate_object then null; end $$;
