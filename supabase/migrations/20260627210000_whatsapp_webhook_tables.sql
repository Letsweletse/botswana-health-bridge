create extension if not exists pgcrypto;

create table if not exists public.whatsapp_webhook_logs (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'incoming',
  from_number text,
  message_body text,
  reply_text text,
  response_status integer,
  error_message text,
  raw_payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists whatsapp_webhook_logs_source_idx on public.whatsapp_webhook_logs(source);
create index if not exists whatsapp_webhook_logs_from_number_idx on public.whatsapp_webhook_logs(from_number);
create index if not exists whatsapp_webhook_logs_created_at_idx on public.whatsapp_webhook_logs(created_at desc);

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

create index if not exists whatsapp_webhook_events_provider_idx on public.whatsapp_webhook_events(provider);
create index if not exists whatsapp_webhook_events_from_phone_idx on public.whatsapp_webhook_events(from_phone);
create index if not exists whatsapp_webhook_events_created_at_idx on public.whatsapp_webhook_events(created_at desc);
