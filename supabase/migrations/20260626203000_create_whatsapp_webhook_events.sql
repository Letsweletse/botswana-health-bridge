create table if not exists public.whatsapp_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'meta',
  message_id text,
  from_phone text,
  to_phone text,
  message_text text,
  message_type text,
  raw_payload jsonb not null,
  status text not null default 'received',
  error text,
  created_at timestamptz not null default now()
);

create index if not exists whatsapp_webhook_events_provider_idx
on public.whatsapp_webhook_events(provider);

create index if not exists whatsapp_webhook_events_from_phone_idx
on public.whatsapp_webhook_events(from_phone);

create index if not exists whatsapp_webhook_events_created_at_idx
on public.whatsapp_webhook_events(created_at desc);

alter table public.whatsapp_webhook_events enable row level security;

drop policy if exists "allow webhook inserts" on public.whatsapp_webhook_events;
create policy "allow webhook inserts"
on public.whatsapp_webhook_events
for insert
with check (true);

drop policy if exists "allow webhook reads" on public.whatsapp_webhook_events;
create policy "allow webhook reads"
on public.whatsapp_webhook_events
for select
using (true);
