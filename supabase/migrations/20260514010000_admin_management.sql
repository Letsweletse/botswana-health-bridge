-- ChekaMeds admin management, pharmacy lifecycle, visibility, and operational tables.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pharmacy_status') THEN
    CREATE TYPE public.pharmacy_status AS ENUM ('pending', 'active', 'suspended');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_status') THEN
    CREATE TYPE public.subscription_status AS ENUM ('trial', 'active', 'overdue', 'frozen');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_request_status') THEN
    CREATE TYPE public.order_request_status AS ENUM ('pending', 'confirmed', 'collected', 'cancelled');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.admin_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pharmacies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  contact_name text,
  contact_email text,
  contact_phone text,
  directions_link text DEFAULT '',
  status public.pharmacy_status NOT NULL DEFAULT 'pending',
  subscription_status public.subscription_status NOT NULL DEFAULT 'trial',
  payment_required boolean NOT NULL DEFAULT false,
  visible_in_search boolean NOT NULL DEFAULT false,
  approved_at timestamptz,
  suspended_at timestamptz,
  suspension_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.pharmacies (name, profile_id, user_id, contact_name, status, subscription_status, payment_required, visible_in_search, approved_at, created_at, updated_at)
SELECT DISTINCT ON (p.clinic_name)
  p.clinic_name,
  p.id,
  p.user_id,
  p.full_name,
  CASE WHEN p.approved THEN 'active'::public.pharmacy_status ELSE 'pending'::public.pharmacy_status END,
  'trial'::public.subscription_status,
  false,
  p.approved,
  CASE WHEN p.approved THEN now() ELSE NULL END,
  p.created_at,
  now()
FROM public.profiles p
WHERE p.clinic_name IS NOT NULL AND p.clinic_name <> ''
ON CONFLICT (name) DO UPDATE SET
  profile_id = COALESCE(public.pharmacies.profile_id, EXCLUDED.profile_id),
  user_id = COALESCE(public.pharmacies.user_id, EXCLUDED.user_id),
  contact_name = COALESCE(public.pharmacies.contact_name, EXCLUDED.contact_name),
  updated_at = now();

INSERT INTO public.pharmacies (name, status, subscription_status, payment_required, visible_in_search, approved_at)
SELECT DISTINCT ci.clinic_name, 'active'::public.pharmacy_status, 'trial'::public.subscription_status, false, true, now()
FROM public.clinic_inventory ci
WHERE ci.clinic_name IS NOT NULL
  AND ci.clinic_name <> ''
  AND ci.clinic_name <> 'ChekaMeds Admin'
ON CONFLICT (name) DO NOTHING;

ALTER TABLE public.pharmacies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
CREATE POLICY "Admins can manage all profiles"
ON public.profiles
FOR ALL
TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can manage pharmacies" ON public.pharmacies;
CREATE POLICY "Admins can manage pharmacies"
ON public.pharmacies
FOR ALL
TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Staff can view own pharmacy" ON public.pharmacies;
CREATE POLICY "Staff can view own pharmacy"
ON public.pharmacies
FOR SELECT
TO authenticated
USING (name = private.get_user_clinic(auth.uid()));

DROP POLICY IF EXISTS "Admins can view admin profiles" ON public.admin_profiles;
CREATE POLICY "Admins can view admin profiles"
ON public.admin_profiles
FOR SELECT
TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Public can read visible active inventory" ON public.clinic_inventory;
DROP POLICY IF EXISTS "Anyone can read inventory" ON public.clinic_inventory;
DROP POLICY IF EXISTS "Staff can read own inventory" ON public.clinic_inventory;
DROP POLICY IF EXISTS "Admins can read all inventory" ON public.clinic_inventory;

CREATE POLICY "Public can read visible active inventory"
ON public.clinic_inventory
FOR SELECT
TO anon, authenticated
USING (EXISTS (
  SELECT 1
  FROM public.pharmacies p
  WHERE p.name = clinic_inventory.clinic_name
    AND p.status = 'active'::public.pharmacy_status
    AND p.visible_in_search = true
));

CREATE POLICY "Staff can read own inventory"
ON public.clinic_inventory
FOR SELECT
TO authenticated
USING (clinic_name = private.get_user_clinic(auth.uid()));

CREATE POLICY "Admins can read all inventory"
ON public.clinic_inventory
FOR SELECT
TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role));

ALTER POLICY "Staff can insert own clinic inventory"
ON public.clinic_inventory
WITH CHECK ((auth.role() = 'authenticated'::text) AND ((clinic_name = private.get_user_clinic(auth.uid())) OR private.has_role(auth.uid(), 'admin'::public.app_role)));

ALTER POLICY "Staff can update own clinic inventory"
ON public.clinic_inventory
USING ((auth.role() = 'authenticated'::text) AND ((clinic_name = private.get_user_clinic(auth.uid())) OR private.has_role(auth.uid(), 'admin'::public.app_role)))
WITH CHECK ((auth.role() = 'authenticated'::text) AND ((clinic_name = private.get_user_clinic(auth.uid())) OR private.has_role(auth.uid(), 'admin'::public.app_role)));

ALTER POLICY "Staff can delete own clinic inventory"
ON public.clinic_inventory
USING ((auth.role() = 'authenticated'::text) AND ((clinic_name = private.get_user_clinic(auth.uid())) OR private.has_role(auth.uid(), 'admin'::public.app_role)));

CREATE OR REPLACE VIEW public.active_pharmacy_inventory
WITH (security_invoker = true) AS
SELECT ci.*
FROM public.clinic_inventory ci
JOIN public.pharmacies p ON p.name = ci.clinic_name
WHERE p.status = 'active'::public.pharmacy_status
  AND p.visible_in_search = true
  AND ci.clinic_name <> 'ChekaMeds Admin';

GRANT SELECT ON public.active_pharmacy_inventory TO anon, authenticated;

CREATE TABLE IF NOT EXISTS public.order_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_number text,
  pharmacy_name text NOT NULL,
  medicine text NOT NULL,
  price_bwp numeric(10,2),
  status public.order_request_status NOT NULL DEFAULT 'pending',
  payment_status text NOT NULL DEFAULT 'manual_collection_pending',
  request_source text NOT NULL DEFAULT 'whatsapp',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.failed_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_number text,
  query text NOT NULL,
  source text NOT NULL DEFAULT 'whatsapp',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.order_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.failed_searches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage order requests" ON public.order_requests;
CREATE POLICY "Admins can manage order requests"
ON public.order_requests
FOR ALL
TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Staff can view own order requests" ON public.order_requests;
CREATE POLICY "Staff can view own order requests"
ON public.order_requests
FOR SELECT
TO authenticated
USING (pharmacy_name = private.get_user_clinic(auth.uid()));

DROP POLICY IF EXISTS "Admins can view failed searches" ON public.failed_searches;
CREATE POLICY "Admins can view failed searches"
ON public.failed_searches
FOR SELECT
TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can manage webhook logs" ON public.whatsapp_webhook_logs;
CREATE POLICY "Admins can manage webhook logs"
ON public.whatsapp_webhook_logs
FOR ALL
TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can manage sessions" ON public.whatsapp_sessions;
CREATE POLICY "Admins can manage sessions"
ON public.whatsapp_sessions
FOR ALL
TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can manage ChekaPay webhook events" ON public.chekapay_webhook_events;
CREATE POLICY "Admins can manage ChekaPay webhook events"
ON public.chekapay_webhook_events
FOR ALL
TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE INDEX IF NOT EXISTS idx_pharmacies_status_visibility ON public.pharmacies (status, visible_in_search);
CREATE INDEX IF NOT EXISTS idx_order_requests_created_at ON public.order_requests (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_failed_searches_created_at ON public.failed_searches (created_at DESC);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_clinic text := COALESCE(NEW.raw_user_meta_data->>'clinic_name', 'Unassigned');
  new_full_name text := COALESCE(NEW.raw_user_meta_data->>'full_name', '');
  new_profile_id uuid;
BEGIN
  INSERT INTO public.profiles (user_id, full_name, clinic_name, approved)
  VALUES (NEW.id, new_full_name, new_clinic, false)
  RETURNING id INTO new_profile_id;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'clinic_staff')
  ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO public.pharmacies (name, profile_id, user_id, contact_name, contact_email, status, subscription_status, payment_required, visible_in_search)
  VALUES (new_clinic, new_profile_id, NEW.id, new_full_name, NEW.email, 'pending', 'trial', false, false)
  ON CONFLICT (name) DO UPDATE SET
    profile_id = EXCLUDED.profile_id,
    user_id = EXCLUDED.user_id,
    contact_name = EXCLUDED.contact_name,
    contact_email = EXCLUDED.contact_email,
    status = CASE WHEN public.pharmacies.status = 'active' THEN public.pharmacies.status ELSE 'pending'::public.pharmacy_status END,
    visible_in_search = CASE WHEN public.pharmacies.status = 'active' THEN public.pharmacies.visible_in_search ELSE false END,
    updated_at = now();

  RETURN NEW;
END;
$$;

ALTER TABLE public.profiles ALTER COLUMN approved SET DEFAULT false;

DO $$
DECLARE
  first_admin_id uuid;
BEGIN
  SELECT id INTO first_admin_id
  FROM auth.users
  WHERE lower(email) = 'iblimenterprise@zohomail.com'
  LIMIT 1;

  IF first_admin_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (first_admin_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;

    INSERT INTO public.admin_profiles (user_id, email)
    VALUES (first_admin_id, 'iblimenterprise@zohomail.com')
    ON CONFLICT (user_id) DO NOTHING;

    INSERT INTO public.profiles (user_id, full_name, clinic_name, approved)
    VALUES (first_admin_id, 'IBLIM Enterprise Admin', 'ChekaMeds Admin', true)
    ON CONFLICT (user_id) DO UPDATE SET approved = true, clinic_name = 'ChekaMeds Admin';
  END IF;
END $$;
