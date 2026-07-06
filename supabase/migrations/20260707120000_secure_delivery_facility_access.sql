create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'pharmacy')),
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

create table if not exists public.pharmacy_user_access (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  pharmacy_name text not null,
  created_at timestamptz not null default now(),
  unique (user_id, pharmacy_name)
);

create index if not exists user_roles_user_role_idx on public.user_roles(user_id, role);
create index if not exists pharmacy_user_access_user_idx on public.pharmacy_user_access(user_id);
create index if not exists pharmacy_user_access_name_idx on public.pharmacy_user_access(lower(pharmacy_name));

alter table public.user_roles enable row level security;
alter table public.pharmacy_user_access enable row level security;
alter table public.medicine_delivery_requests enable row level security;
alter table public.delivery_drivers enable row level security;

do $$
declare
  pol record;
begin
  for pol in
    select policyname
    from pg_policies
    where schemaname = 'public'
    and tablename = 'medicine_delivery_requests'
  loop
    execute format('drop policy if exists %I on public.medicine_delivery_requests', pol.policyname);
  end loop;

  for pol in
    select policyname
    from pg_policies
    where schemaname = 'public'
    and tablename = 'delivery_drivers'
  loop
    execute format('drop policy if exists %I on public.delivery_drivers', pol.policyname);
  end loop;

  for pol in
    select policyname
    from pg_policies
    where schemaname = 'public'
    and tablename = 'user_roles'
  loop
    execute format('drop policy if exists %I on public.user_roles', pol.policyname);
  end loop;

  for pol in
    select policyname
    from pg_policies
    where schemaname = 'public'
    and tablename = 'pharmacy_user_access'
  loop
    execute format('drop policy if exists %I on public.pharmacy_user_access', pol.policyname);
  end loop;
end $$;

create policy "users can read own roles"
on public.user_roles
for select
to authenticated
using (user_id = auth.uid());

create policy "users can read own pharmacy access"
on public.pharmacy_user_access
for select
to authenticated
using (user_id = auth.uid());

create policy "public can create delivery requests"
on public.medicine_delivery_requests
for insert
to anon, authenticated
with check (true);

create policy "admin or matching pharmacy can read delivery requests"
on public.medicine_delivery_requests
for select
to authenticated
using (
  exists (
    select 1
    from public.user_roles roles
    where roles.user_id = auth.uid()
    and roles.role = 'admin'
  )
  or exists (
    select 1
    from public.pharmacy_user_access access
    where access.user_id = auth.uid()
    and lower(access.pharmacy_name) = lower(medicine_delivery_requests.pharmacy_name)
  )
);

create policy "admin or matching pharmacy can update delivery requests"
on public.medicine_delivery_requests
for update
to authenticated
using (
  exists (
    select 1
    from public.user_roles roles
    where roles.user_id = auth.uid()
    and roles.role = 'admin'
  )
  or exists (
    select 1
    from public.pharmacy_user_access access
    where access.user_id = auth.uid()
    and lower(access.pharmacy_name) = lower(medicine_delivery_requests.pharmacy_name)
  )
)
with check (
  exists (
    select 1
    from public.user_roles roles
    where roles.user_id = auth.uid()
    and roles.role = 'admin'
  )
  or exists (
    select 1
    from public.pharmacy_user_access access
    where access.user_id = auth.uid()
    and lower(access.pharmacy_name) = lower(medicine_delivery_requests.pharmacy_name)
  )
);

create policy "authenticated users can read active delivery drivers"
on public.delivery_drivers
for select
to authenticated
using (is_active = true);

create policy "admins can manage delivery drivers"
on public.delivery_drivers
for all
to authenticated
using (
  exists (
    select 1
    from public.user_roles roles
    where roles.user_id = auth.uid()
    and roles.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.user_roles roles
    where roles.user_id = auth.uid()
    and roles.role = 'admin'
  )
);
