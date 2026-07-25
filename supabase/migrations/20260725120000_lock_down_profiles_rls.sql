-- Close open PII/self-approval hole on public.profiles: SELECT/INSERT/UPDATE were USING(true)/CHECK(true)
-- for anon+authenticated, letting anyone read all facility PII and self-grant approved=true.

drop policy if exists "profiles_insert_anon_authenticated" on public.profiles;
drop policy if exists "profiles_select_anon_authenticated" on public.profiles;
drop policy if exists "profiles_update_anon_authenticated" on public.profiles;

create policy "profiles_select_own_or_admin"
  on public.profiles for select
  to authenticated
  using (
    auth.uid() = id
    or exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid() and ur.role = 'admin'
    )
  );

create policy "profiles_insert_own"
  on public.profiles for insert
  to authenticated
  with check (
    auth.uid() = id
    and coalesce(approved, false) = false
    and coalesce(role, '') <> 'admin'
  );

create policy "profiles_update_own_or_admin"
  on public.profiles for update
  to authenticated
  using (
    auth.uid() = id
    or exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid() and ur.role = 'admin'
    )
  )
  with check (
    auth.uid() = id
    or exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid() and ur.role = 'admin'
    )
  );

-- Belt-and-suspenders: even with the update policy above, a non-admin owner
-- must not be able to flip their own approval/role fields via UPDATE.
create or replace function public.protect_profile_privileged_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid() and ur.role = 'admin'
  ) then
    new.approved := old.approved;
    new.status := old.status;
    new.role := old.role;
    new.approved_at := old.approved_at;
    new.suspended_at := old.suspended_at;
    new.suspension_reason := old.suspension_reason;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_privileged_fields_trg on public.profiles;
create trigger protect_profile_privileged_fields_trg
  before update on public.profiles
  for each row execute function public.protect_profile_privileged_fields();

-- Newly inserted profiles must start unapproved/pending, not approved by default.
alter table public.profiles alter column approved set default false;
alter table public.profiles alter column status set default 'pending';
