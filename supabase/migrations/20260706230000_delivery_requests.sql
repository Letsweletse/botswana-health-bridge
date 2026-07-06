create table if not exists public.delivery_drivers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null unique,
  vehicle_type text,
  vehicle_registration text,
  service_area text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.medicine_delivery_requests (
  id uuid primary key default gen_random_uuid(),
  patient_name text not null,
  patient_phone text not null,
  delivery_address text not null,
  pharmacy_name text not null,
  pharmacy_contact text,
  medicine_name text not null,
  inventory_id uuid,
  delivery_fee_bwp numeric,
  order_status text not null default 'requested',
  driver_id uuid references public.delivery_drivers(id),
  proof_of_delivery_url text,
  delivery_pin text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists delivery_drivers_active_idx on public.delivery_drivers(is_active);
create index if not exists delivery_requests_phone_idx on public.medicine_delivery_requests(patient_phone);
create index if not exists delivery_requests_facility_idx on public.medicine_delivery_requests(pharmacy_name);
create index if not exists delivery_requests_status_idx on public.medicine_delivery_requests(order_status);
create index if not exists delivery_requests_driver_idx on public.medicine_delivery_requests(driver_id);
