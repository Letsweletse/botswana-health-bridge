-- Lock down tables that were readable and writable with the public (anon) key.
--
-- Background: an audit on 2026-10-09 found 11 tables in the public schema with
-- row level security DISABLED and full privileges granted to anon, so anyone
-- holding the site's publishable key could read, edit, delete or TRUNCATE them.
-- This migration was applied by hand in the SQL editor first; it is written to be
-- idempotent so it is safe to re-run, and so a database rebuilt from migrations
-- ends up in the same locked-down state.
--
-- These tables are not created by earlier migrations (they were created in the
-- dashboard), so every statement is guarded with to_regclass().
-- Edge Functions use the service role, which bypasses RLS, so they keep working.

do $$
declare
  t text;
  all_tables text[] := array[
    'admin_contacts','admin_email_log','admin_tasks','admin_tokens',
    'broadcast_campaigns','broadcast_deliveries','notification_optouts',
    'platform_analytics','search_impressions','sms_log','stock_watchlist'
  ];
begin
  foreach t in array all_tables loop
    if to_regclass('public.' || t) is not null then
      execute format('alter table public.%I enable row level security', t);
      execute format('revoke all on table public.%I from anon, authenticated', t);
    else
      raise notice 'skipping %, table does not exist', t;
    end if;
  end loop;
end $$;

-- The admin panel reads search_impressions: allow admins only.
-- Live database signature is has_role(text, uuid); older migrations define
-- has_role(uuid, app_role). Support either, and skip with a notice if neither exists.
do $$
begin
  if to_regclass('public.search_impressions') is null then
    return;
  end if;

  execute 'drop policy if exists "admins read search_impressions" on public.search_impressions';

  if to_regprocedure('public.has_role(text,uuid)') is not null then
    execute $p$create policy "admins read search_impressions" on public.search_impressions
      for select to authenticated using (public.has_role('admin', auth.uid()))$p$;
    execute 'grant select on table public.search_impressions to authenticated';
  elsif to_regprocedure('public.has_role(uuid,public.app_role)') is not null then
    execute $p$create policy "admins read search_impressions" on public.search_impressions
      for select to authenticated using (public.has_role(auth.uid(), 'admin'::public.app_role))$p$;
    execute 'grant select on table public.search_impressions to authenticated';
  else
    raise notice 'has_role() not found: search_impressions stays closed to everyone except the service role';
  end if;
end $$;
