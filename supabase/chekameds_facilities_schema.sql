-- ChekaMeds facilities table for public facility directory and map listings.

create extension if not exists pgcrypto;

create table if not exists public.chekameds_facilities (
  id uuid primary key default gen_random_uuid(),
  facility_name text not null,
  facility_slug text not null unique,
  facility_type text,
  city_town text,
  area text,
  address text,
  phone_whatsapp text,
  email text,
  website text,
  google_maps_url text,
  latitude numeric,
  longitude numeric,
  geocode_status text,
  listing_status text not null default 'directory_listing',
  stock_visibility boolean not null default false,
  can_receive_reservations boolean not null default false,
  public_note text,
  disclaimer text,
  source text not null default 'public_directory',
  notes text,
  checked_by text,
  checked_date date,
  map_import_ready boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists chekameds_facilities_city_idx on public.chekameds_facilities(city_town);
create index if not exists chekameds_facilities_type_idx on public.chekameds_facilities(facility_type);
create index if not exists chekameds_facilities_listing_status_idx on public.chekameds_facilities(listing_status);
create index if not exists chekameds_facilities_map_ready_idx on public.chekameds_facilities(map_import_ready);

alter table public.chekameds_facilities enable row level security;

drop policy if exists "chekameds_facilities_public_read" on public.chekameds_facilities;
create policy "chekameds_facilities_public_read"
on public.chekameds_facilities
for select
to anon, authenticated
using (true);

drop policy if exists "chekameds_facilities_admin_write" on public.chekameds_facilities;
create policy "chekameds_facilities_admin_write"
on public.chekameds_facilities
for all
to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

create or replace function public.touch_chekameds_facilities_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists chekameds_facilities_touch_updated_at on public.chekameds_facilities;
create trigger chekameds_facilities_touch_updated_at
before update on public.chekameds_facilities
for each row
execute function public.touch_chekameds_facilities_updated_at();

create or replace view public.chekameds_public_facilities_map as
select
  facility_name,
  facility_slug,
  facility_type,
  city_town,
  area,
  address,
  phone_whatsapp,
  email,
  website,
  google_maps_url,
  latitude,
  longitude,
  listing_status,
  stock_visibility,
  can_receive_reservations,
  public_note,
  disclaimer,
  source,
  notes,
  map_import_ready,
  updated_at
from public.chekameds_facilities
where listing_status in ('directory_listing', 'listed', 'verified', 'connected');
