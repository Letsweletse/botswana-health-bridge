-- admin_notifications had only an admin-read policy. The registration flow
-- (Register.tsx) needs to insert its own new_pharmacy notification.
create policy "admin_notifications_insert_own"
  on public.admin_notifications for insert
  to authenticated
  with check (auth.uid() = profile_id);

-- Admins need to mark notifications read once actioned.
create policy "admin_notifications_admin_update"
  on public.admin_notifications for update
  to authenticated
  using (exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role = 'admin'))
  with check (exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role = 'admin'));

-- pharmacies had only the self-insert policy. Admins need to read and approve
-- (status/visible_in_search) pending registrations from AdminPanel.
create policy "pharmacies_admin_read"
  on public.pharmacies for select
  to authenticated
  using (exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role = 'admin'));

create policy "pharmacies_admin_update"
  on public.pharmacies for update
  to authenticated
  using (exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role = 'admin'))
  with check (exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role = 'admin'));
