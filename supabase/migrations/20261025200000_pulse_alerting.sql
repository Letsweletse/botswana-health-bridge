-- ChekaMeds Pulse: alert subscribers, alert log and acknowledgements.
-- Safe to run more than once. Creates new tables only; changes no existing data.
-- Both tables are server-only: RLS on, no policies, so only the service role
-- (Vercel API) can read or write them. Nothing here is visible to the public site.

-- 1. Who receives Pulse alerts.
create table if not exists public.pulse_subscribers (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  role             text not null check (role in ('founder', 'dhmt', 'cms', 'moh', 'bomra', 'pharmacy', 'other')),
  organisation     text,
  whatsapp         text check (whatsapp is null or whatsapp ~ '^267[0-9]{8}$'),
  email            text,
  towns            text[] not null default '{}',   -- Pulse town ids; empty = all towns
  groups           text[] not null default '{}',   -- Pulse signal groups; empty = all groups
  min_level        text not null default 'alert' check (min_level in ('watch', 'alert')),
  weekly_bulletin  boolean not null default true,
  last_bulletin    date,                          -- week of the last bulletin sent
  active           boolean not null default true,
  created_at       timestamptz not null default now()
);
alter table public.pulse_subscribers enable row level security;

-- 2. Every alert Pulse raises, once per week / place / signal group,
--    with its delivery record and the officer's acknowledgement.
create table if not exists public.pulse_alerts (
  id              uuid primary key default gen_random_uuid(),
  week            date not null,                 -- Monday of the alert week
  town            text not null,                 -- Pulse town id, or 'botswana' for national
  town_name       text not null,
  grp             text not null,                 -- Pulse signal group id
  label           text not null,
  level           text not null check (level in ('watch', 'alert')),
  kind            text not null default 'demand' check (kind in ('demand', 'supply')),
  score           numeric,
  reasons         text[] not null default '{}',
  action          text,
  owner           text,
  status          text not null default 'new' check (status in ('new', 'checked', 'confirmed', 'false_alarm')),
  status_note     text,
  status_by       text,
  status_at       timestamptz,
  notified_at     timestamptz,
  notified_count  integer not null default 0,
  created_at      timestamptz not null default now(),
  constraint pulse_alerts_once unique (week, town, grp)
);
alter table public.pulse_alerts enable row level security;
create index if not exists pulse_alerts_week_idx on public.pulse_alerts (week desc);

-- 3. Seed the founder as the first recipient (WhatsApp, all towns, alerts only).
insert into public.pulse_subscribers (name, role, organisation, whatsapp, email, min_level)
select 'Letsweletse Seatla', 'founder', 'IBLIM Enterprises (Pty) Ltd', '26775560140', 'info@chekameds.co.bw', 'alert'
where not exists (select 1 from public.pulse_subscribers where whatsapp = '26775560140');

-- 4. Speeds up the WhatsApp bot (v201+) looking up a number's last known town.
create index if not exists search_logs_phone_location_idx
  on public.search_logs (user_phone, created_at desc)
  where location is not null;
