-- ChekaMeds pharmacy digests: weekly summary + monthly market report.
-- Safe to run more than once. Creates three small tables; changes nothing else.
-- Only the server (service role) reads or writes them; no public access.

create table if not exists public.pharmacy_digest_log (
  id uuid primary key default gen_random_uuid(),
  clinic_name text not null,
  week date not null,
  whatsapp_ok boolean,
  email_ok boolean,
  error text,
  sent_at timestamptz not null default now(),
  kind text not null default 'weekly'
);
-- Works whether or not an earlier version of this table was created.
alter table public.pharmacy_digest_log add column if not exists kind text not null default 'weekly';
alter table public.pharmacy_digest_log drop constraint if exists pharmacy_digest_log_clinic_name_week_key;
create unique index if not exists pharmacy_digest_log_once on public.pharmacy_digest_log (clinic_name, week, kind);

create table if not exists public.pharmacy_digest_optouts (
  clinic_name text primary key,
  via text not null default 'link',
  created_at timestamptz not null default now()
);

create table if not exists public.pharmacy_digest_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- Weekly sending starts OFF. Switch it on from /admin/digest after checking the previews.
insert into public.pharmacy_digest_settings (key, value) values ('live', 'false'::jsonb), ('live_monthly', 'false'::jsonb)
on conflict (key) do nothing;

alter table public.pharmacy_digest_log enable row level security;
alter table public.pharmacy_digest_optouts enable row level security;
alter table public.pharmacy_digest_settings enable row level security;
