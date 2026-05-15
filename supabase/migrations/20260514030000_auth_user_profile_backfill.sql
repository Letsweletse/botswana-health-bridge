-- Backfill auth.users into operational profile/pharmacy tables so admins can see every signup.
-- This fixes cases where Auth contains users but earlier profile triggers did not create visible rows.

INSERT INTO public.profiles (user_id, full_name, clinic_name, approved)
SELECT
  u.id,
  COALESCE(NULLIF(u.raw_user_meta_data->>'full_name', ''), u.email, 'Unknown user'),
  CASE
    WHEN lower(COALESCE(u.email, '')) = 'iblimenterprise@zohomail.com' THEN 'ChekaMeds Admin'
    ELSE COALESCE(NULLIF(u.raw_user_meta_data->>'clinic_name', ''), 'Facility ' || left(u.id::text, 8))
  END,
  lower(COALESCE(u.email, '')) = 'iblimenterprise@zohomail.com'
FROM auth.users u
ON CONFLICT (user_id) DO UPDATE SET
  full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
  clinic_name = COALESCE(NULLIF(public.profiles.clinic_name, 'Unassigned'), EXCLUDED.clinic_name),
  updated_at = now();

INSERT INTO public.user_roles (user_id, role)
SELECT
  u.id,
  CASE
    WHEN lower(COALESCE(u.email, '')) = 'iblimenterprise@zohomail.com' THEN 'admin'::public.app_role
    ELSE 'clinic_staff'::public.app_role
  END
FROM auth.users u
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO public.admin_profiles (user_id, email)
SELECT u.id, u.email
FROM auth.users u
WHERE lower(COALESCE(u.email, '')) = 'iblimenterprise@zohomail.com'
ON CONFLICT (user_id) DO NOTHING;

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
SELECT
  p.clinic_name,
  p.id,
  p.user_id,
  p.full_name,
  u.email,
  CASE WHEN p.approved THEN 'active'::public.pharmacy_status ELSE 'pending'::public.pharmacy_status END,
  'trial'::public.subscription_status,
  false,
  p.approved,
  CASE WHEN p.approved THEN COALESCE(p.updated_at, now()) ELSE NULL END,
  now()
FROM public.profiles p
JOIN auth.users u ON u.id = p.user_id
WHERE p.clinic_name IS NOT NULL
  AND p.clinic_name <> ''
ON CONFLICT (name) DO UPDATE SET
  profile_id = EXCLUDED.profile_id,
  user_id = EXCLUDED.user_id,
  contact_name = COALESCE(public.pharmacies.contact_name, EXCLUDED.contact_name),
  contact_email = COALESCE(public.pharmacies.contact_email, EXCLUDED.contact_email),
  updated_at = now();
