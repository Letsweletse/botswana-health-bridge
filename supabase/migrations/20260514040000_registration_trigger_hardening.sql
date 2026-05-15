-- Ensure every new Supabase Auth signup creates a pending profile/pharmacy row immediately.
-- This hardens production if the original auth trigger was missing, disabled, or running older logic.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_clinic text := COALESCE(NULLIF(NEW.raw_user_meta_data->>'clinic_name', ''), 'Facility ' || left(NEW.id::text, 8));
  new_full_name text := COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), NEW.email, 'New facility user');
  new_profile_id uuid;
  is_first_admin boolean := lower(COALESCE(NEW.email, '')) = 'iblimenterprise@zohomail.com';
BEGIN
  IF is_first_admin THEN
    new_clinic := 'ChekaMeds Admin';
  END IF;

  INSERT INTO public.profiles (user_id, full_name, clinic_name, approved)
  VALUES (NEW.id, new_full_name, new_clinic, is_first_admin)
  ON CONFLICT (user_id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    clinic_name = EXCLUDED.clinic_name,
    approved = public.profiles.approved OR EXCLUDED.approved,
    updated_at = now()
  RETURNING id INTO new_profile_id;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE WHEN is_first_admin THEN 'admin'::public.app_role ELSE 'clinic_staff'::public.app_role END)
  ON CONFLICT (user_id, role) DO NOTHING;

  IF is_first_admin THEN
    INSERT INTO public.admin_profiles (user_id, email)
    VALUES (NEW.id, NEW.email)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  INSERT INTO public.pharmacies (
    name,
    profile_id,
    user_id,
    contact_name,
    contact_email,
    status,
    subscription_status,
    payment_required,
    visible_in_search,
    approved_at,
    updated_at
  )
  VALUES (
    new_clinic,
    new_profile_id,
    NEW.id,
    new_full_name,
    NEW.email,
    CASE WHEN is_first_admin THEN 'active'::public.pharmacy_status ELSE 'pending'::public.pharmacy_status END,
    'trial'::public.subscription_status,
    false,
    is_first_admin,
    CASE WHEN is_first_admin THEN now() ELSE NULL END,
    now()
  )
  ON CONFLICT (name) DO UPDATE SET
    profile_id = EXCLUDED.profile_id,
    user_id = EXCLUDED.user_id,
    contact_name = EXCLUDED.contact_name,
    contact_email = EXCLUDED.contact_email,
    status = CASE
      WHEN EXCLUDED.status = 'active'::public.pharmacy_status THEN 'active'::public.pharmacy_status
      WHEN public.pharmacies.status = 'suspended'::public.pharmacy_status THEN public.pharmacies.status
      ELSE 'pending'::public.pharmacy_status
    END,
    visible_in_search = CASE
      WHEN EXCLUDED.status = 'active'::public.pharmacy_status THEN true
      WHEN public.pharmacies.status = 'suspended'::public.pharmacy_status THEN false
      ELSE public.pharmacies.visible_in_search
    END,
    updated_at = now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- One-command approval helper for database admins; direct profile updates still work too.
CREATE OR REPLACE FUNCTION public.approve_pharmacy_by_name(_clinic_name text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.profiles
  SET approved = true,
      updated_at = now()
  WHERE clinic_name = _clinic_name
    AND private.has_role(auth.uid(), 'admin'::public.app_role);
$$;

REVOKE EXECUTE ON FUNCTION public.approve_pharmacy_by_name(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_pharmacy_by_name(text) TO authenticated;
