-- Make pharmacy registration approval manageable directly from the database.
-- Admins can approve a facility by setting public.profiles.approved = true;
-- the matching public.pharmacies row becomes active and visible automatically.

CREATE OR REPLACE FUNCTION public.sync_pharmacy_from_profile_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.pharmacies (
    name,
    profile_id,
    user_id,
    contact_name,
    status,
    subscription_status,
    payment_required,
    visible_in_search,
    approved_at,
    suspended_at,
    suspension_reason,
    updated_at
  )
  VALUES (
    NEW.clinic_name,
    NEW.id,
    NEW.user_id,
    NEW.full_name,
    CASE WHEN NEW.approved THEN 'active'::public.pharmacy_status ELSE 'pending'::public.pharmacy_status END,
    'trial'::public.subscription_status,
    false,
    NEW.approved,
    CASE WHEN NEW.approved THEN COALESCE(NEW.updated_at, now()) ELSE NULL END,
    NULL,
    NULL,
    now()
  )
  ON CONFLICT (name) DO UPDATE SET
    profile_id = EXCLUDED.profile_id,
    user_id = EXCLUDED.user_id,
    contact_name = EXCLUDED.contact_name,
    status = CASE
      WHEN EXCLUDED.status = 'active'::public.pharmacy_status THEN 'active'::public.pharmacy_status
      WHEN public.pharmacies.status = 'suspended'::public.pharmacy_status THEN public.pharmacies.status
      ELSE 'pending'::public.pharmacy_status
    END,
    visible_in_search = CASE
      WHEN EXCLUDED.status = 'active'::public.pharmacy_status THEN true
      WHEN public.pharmacies.status = 'suspended'::public.pharmacy_status THEN false
      ELSE false
    END,
    approved_at = CASE
      WHEN EXCLUDED.status = 'active'::public.pharmacy_status THEN COALESCE(public.pharmacies.approved_at, now())
      ELSE public.pharmacies.approved_at
    END,
    updated_at = now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_pharmacy_from_profile_approval_trigger ON public.profiles;
CREATE TRIGGER sync_pharmacy_from_profile_approval_trigger
AFTER INSERT OR UPDATE OF approved, clinic_name, full_name
ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_pharmacy_from_profile_approval();

CREATE OR REPLACE FUNCTION public.sync_profile_from_pharmacy_lifecycle()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.profile_id IS NOT NULL THEN
    UPDATE public.profiles
    SET approved = (NEW.status = 'active'::public.pharmacy_status AND NEW.visible_in_search = true),
        updated_at = now()
    WHERE id = NEW.profile_id;
  ELSIF NEW.user_id IS NOT NULL THEN
    UPDATE public.profiles
    SET approved = (NEW.status = 'active'::public.pharmacy_status AND NEW.visible_in_search = true),
        updated_at = now()
    WHERE user_id = NEW.user_id;
  ELSE
    UPDATE public.profiles
    SET approved = (NEW.status = 'active'::public.pharmacy_status AND NEW.visible_in_search = true),
        updated_at = now()
    WHERE clinic_name = NEW.name;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_profile_from_pharmacy_lifecycle_trigger ON public.pharmacies;
CREATE TRIGGER sync_profile_from_pharmacy_lifecycle_trigger
AFTER UPDATE OF status, visible_in_search
ON public.pharmacies
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status OR OLD.visible_in_search IS DISTINCT FROM NEW.visible_in_search)
EXECUTE FUNCTION public.sync_profile_from_pharmacy_lifecycle();

-- Backfill pending pharmacy rows for any profiles created before this migration.
INSERT INTO public.pharmacies (name, profile_id, user_id, contact_name, status, subscription_status, payment_required, visible_in_search, approved_at, updated_at)
SELECT
  p.clinic_name,
  p.id,
  p.user_id,
  p.full_name,
  CASE WHEN p.approved THEN 'active'::public.pharmacy_status ELSE 'pending'::public.pharmacy_status END,
  'trial'::public.subscription_status,
  false,
  p.approved,
  CASE WHEN p.approved THEN now() ELSE NULL END,
  now()
FROM public.profiles p
WHERE p.clinic_name IS NOT NULL
  AND p.clinic_name <> ''
ON CONFLICT (name) DO UPDATE SET
  profile_id = EXCLUDED.profile_id,
  user_id = EXCLUDED.user_id,
  contact_name = COALESCE(public.pharmacies.contact_name, EXCLUDED.contact_name),
  updated_at = now();
