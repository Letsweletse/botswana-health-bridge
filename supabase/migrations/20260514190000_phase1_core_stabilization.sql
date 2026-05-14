-- ChekaMeds Phase 1 core stabilization
-- Safe additive migration: facility lifecycle, search quality, failed search tracking.

create extension if not exists pg_trgm with schema extensions;

-- Profiles: keep backwards compatibility with existing approval flow.
alter table if exists public.profiles
  add column if not exists approved boolean default false,
  add column if not exists status text default 'pending',
  add column if not exists suspension_reason text,
  add column if not exists approved_at timestamptz,
  add column if not exists suspended_at timestamptz,
  add column if not exists updated_at timestamptz default now();

-- Pharmacies/facilities operational table.
create table if not exists public.pharmacies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  email text,
  clinic_name text,
  contact text,
  location text,
  directions_link text,
  status text default 'pending',
  subscription_status text default 'trial',
  payment_required boolean default false,
  visible_in_search boolean default false,
  approved_at timestamptz,
  suspended_at timestamptz,
  suspension_reason text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index if not exists pharmacies_user_id_uidx on public.pharmacies(user_id) where user_id is not null;
create index if not exists pharmacies_status_idx on public.pharmacies(status);
create index if not exists pharmacies_visible_idx on public.pharmacies(visible_in_search);

-- Inventory launch fields.
alter table if exists public.clinic_inventory
  add column if not exists location text,
  add column if not exists contact text,
  add column if not exists directions_link text,
  add column if not exists generic_name text,
  add column if not exists brand_name text,
  add column if not exists search_tokens text,
  add column if not exists last_verified_at timestamptz;

-- Improve search speed and typo tolerance.
create index if not exists clinic_inventory_med_name_trgm_idx
  on public.clinic_inventory using gin (med_name extensions.gin_trgm_ops);

create index if not exists clinic_inventory_search_tokens_trgm_idx
  on public.clinic_inventory using gin (search_tokens extensions.gin_trgm_ops);

create index if not exists clinic_inventory_clinic_name_idx on public.clinic_inventory(clinic_name);
create index if not exists clinic_inventory_quantity_idx on public.clinic_inventory(quantity);

-- Failed searches are valuable product intelligence.
create table if not exists public.failed_searches (
  id uuid primary key default gen_random_uuid(),
  query text not null,
  source text default 'web',
  user_phone text,
  location text,
  created_at timestamptz default now()
);

alter table public.failed_searches enable row level security;

do $$ begin
  create policy "Anyone can insert failed searches"
    on public.failed_searches for insert
    with check (true);
exception when duplicate_object then null; end $$;

-- Medicine aliases: keeps search quality improving without code redeploys.
create table if not exists public.medicine_aliases (
  id uuid primary key default gen_random_uuid(),
  alias text not null unique,
  canonical_name text not null,
  notes text,
  created_at timestamptz default now()
);

alter table public.medicine_aliases enable row level security;

do $$ begin
  create policy "Public can read medicine aliases"
    on public.medicine_aliases for select
    using (true);
exception when duplicate_object then null; end $$;

insert into public.medicine_aliases (alias, canonical_name, notes) values
  ('panado', 'paracetamol', 'Common Botswana brand name'),
  ('panadol', 'paracetamol', 'Common brand spelling'),
  ('painkiller', 'paracetamol', 'Symptom-style search'),
  ('headache', 'paracetamol', 'Symptom-style search'),
  ('bp tablets', 'amlodipine', 'Common layman term'),
  ('blood pressure', 'amlodipine', 'Common layman term'),
  ('sugar tablets', 'metformin', 'Common layman term'),
  ('diabetes tablets', 'metformin', 'Common layman term'),
  ('heartburn', 'omeprazole', 'Symptom-style search'),
  ('flu', 'paracetamol', 'Common symptom search')
on conflict (alias) do nothing;

-- Backfill search tokens.
update public.clinic_inventory
set search_tokens = lower(concat_ws(' ', med_name, generic_name, brand_name, strength, dosage_form, atc_code, atc_description, category))
where search_tokens is null;

-- Active visible inventory view for public reads. If pharmacy rows are absent, existing inventory still works.
create or replace view public.active_pharmacy_inventory as
select ci.*
from public.clinic_inventory ci
left join public.pharmacies p
  on lower(p.clinic_name) = lower(ci.clinic_name)
where ci.quantity > 0
  and coalesce(ci.clinic_name, '') <> 'ChekaMeds Admin'
  and (
    p.id is null
    or (p.status = 'active' and p.visible_in_search = true and p.subscription_status <> 'frozen')
  );
