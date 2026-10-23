-- Partner and licensing enquiries from chekameds.co.bw/partners.
--
-- Rows are written only by the Vercel function api/partner-enquiry.ts using the
-- service role (which bypasses RLS). The public (anon) key cannot read or write
-- this table. Admins can read and update status from the admin panel.
-- Idempotent: safe to run more than once.

create table if not exists public.partner_enquiries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  full_name text not null check (char_length(full_name) between 2 and 120),
  organisation text not null check (char_length(organisation) between 2 and 160),
  job_title text check (char_length(job_title) <= 120),
  country text not null check (char_length(country) between 2 and 80),
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 200),
  phone text check (char_length(phone) <= 40),
  organisation_type text check (char_length(organisation_type) <= 60),
  pharmacy_count integer check (pharmacy_count is null or pharmacy_count between 0 and 100000),
  plan_interest text check (plan_interest in ('pilot', 'white_label', 'insights', 'not_sure')),
  channels text[] not null default '{}'::text[],
  message text check (char_length(message) <= 4000),
  source text check (char_length(source) <= 200),
  status text not null default 'new' check (status in ('new', 'contacted', 'call_booked', 'proposal_sent', 'won', 'lost')),
  admin_notes text check (char_length(admin_notes) <= 4000),
  notified boolean not null default false
);

create index if not exists partner_enquiries_created_at_idx on public.partner_enquiries (created_at desc);
create index if not exists partner_enquiries_status_idx on public.partner_enquiries (status);

alter table public.partner_enquiries enable row level security;
revoke all on table public.partner_enquiries from anon, authenticated;

-- Admin read + status updates. The live database has has_role(text, uuid);
-- older migrations define has_role(uuid, app_role). Support either.
do $$
begin
  execute 'drop policy if exists "admins read partner_enquiries" on public.partner_enquiries';
  execute 'drop policy if exists "admins update partner_enquiries" on public.partner_enquiries';

  if to_regprocedure('public.has_role(text,uuid)') is not null then
    execute $p$create policy "admins read partner_enquiries" on public.partner_enquiries
      for select to authenticated using (public.has_role('admin', auth.uid()))$p$;
    execute $p$create policy "admins update partner_enquiries" on public.partner_enquiries
      for update to authenticated using (public.has_role('admin', auth.uid()))
      with check (public.has_role('admin', auth.uid()))$p$;
  elsif to_regprocedure('public.has_role(uuid,public.app_role)') is not null then
    execute $p$create policy "admins read partner_enquiries" on public.partner_enquiries
      for select to authenticated using (public.has_role(auth.uid(), 'admin'::public.app_role))$p$;
    execute $p$create policy "admins update partner_enquiries" on public.partner_enquiries
      for update to authenticated using (public.has_role(auth.uid(), 'admin'::public.app_role))
      with check (public.has_role(auth.uid(), 'admin'::public.app_role))$p$;
  else
    raise notice 'has_role() not found: partner_enquiries stays closed to everyone except the service role';
    return;
  end if;

  execute 'grant select on table public.partner_enquiries to authenticated';
  execute 'grant update (status, admin_notes) on table public.partner_enquiries to authenticated';
end $$;
