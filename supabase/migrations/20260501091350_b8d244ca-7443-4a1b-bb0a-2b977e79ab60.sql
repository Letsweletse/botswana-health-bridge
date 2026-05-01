CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION private.get_user_clinic(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT clinic_name
  FROM public.profiles
  WHERE user_id = _user_id
  LIMIT 1
$$;

ALTER POLICY "Staff can delete own clinic inventory"
ON public.clinic_inventory
USING ((auth.role() = 'authenticated'::text) AND ((clinic_name = private.get_user_clinic(auth.uid())) OR private.has_role(auth.uid(), 'admin'::public.app_role)));

ALTER POLICY "Staff can insert own clinic inventory"
ON public.clinic_inventory
WITH CHECK ((auth.role() = 'authenticated'::text) AND ((clinic_name = private.get_user_clinic(auth.uid())) OR private.has_role(auth.uid(), 'admin'::public.app_role)));

ALTER POLICY "Staff can update own clinic inventory"
ON public.clinic_inventory
USING ((auth.role() = 'authenticated'::text) AND ((clinic_name = private.get_user_clinic(auth.uid())) OR private.has_role(auth.uid(), 'admin'::public.app_role)));

ALTER POLICY "Admins can update all profiles"
ON public.profiles
USING (private.has_role(auth.uid(), 'admin'::public.app_role));

ALTER POLICY "Admins can view all profiles"
ON public.profiles
USING (private.has_role(auth.uid(), 'admin'::public.app_role));

ALTER POLICY "Admins can manage roles"
ON public.user_roles
USING (private.has_role(auth.uid(), 'admin'::public.app_role));

REVOKE ALL ON SCHEMA private FROM PUBLIC;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA private FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_clinic(uuid) FROM PUBLIC, anon, authenticated;