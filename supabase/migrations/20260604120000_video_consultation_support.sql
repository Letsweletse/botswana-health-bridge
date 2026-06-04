-- ChekaMeds Consultant video consultation support
-- Safe additive migration: creates consultant_requests if absent and adds Daily.co room tracking columns.

create table if not exists public.consultant_requests (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null,
  location text not null,
  symptoms text not null,
  symptom_duration text,
  age_group text,
  pregnancy_status text,
  existing_conditions text,
  allergies text,
  prescription_url text,
  emergency_flags text[] default '{}',
  request_status text default 'new',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.consultant_requests
  add column if not exists video_room_url text,
  add column if not exists video_room_created_at timestamptz,
  add column if not exists video_room_expires_at timestamptz,
  add column if not exists consultation_type text default 'chat',
  add column if not exists consultation_status text default 'requested';

create index if not exists consultant_requests_created_at_idx on public.consultant_requests(created_at desc);
create index if not exists consultant_requests_consultation_status_idx on public.consultant_requests(consultation_status);
create index if not exists consultant_requests_request_status_idx on public.consultant_requests(request_status);

alter table public.consultant_requests enable row level security;

do $$ begin
  create policy "Patients can submit consultant requests"
    on public.consultant_requests for insert
    with check (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Authenticated facility users can view consultant requests"
    on public.consultant_requests for select
    using (auth.role() = 'authenticated');
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Authenticated facility users can update consultant requests"
    on public.consultant_requests for update
    using (auth.role() = 'authenticated')
    with check (auth.role() = 'authenticated');
exception when duplicate_object then null; end $$;
