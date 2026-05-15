-- Harden public/WhatsApp inventory visibility so only approved, real pharmacies with real map links are searchable.

CREATE OR REPLACE VIEW public.active_pharmacy_inventory
WITH (security_invoker = true) AS
SELECT
  ci.id,
  ci.clinic_name,
  ci.med_name,
  ci.category,
  ci.quantity,
  ci.trend,
  ci.updated_at,
  ci.strength,
  ci.dosage_form,
  ci.pack_size,
  ci.atc_code,
  ci.atc_description,
  ci.facility_level,
  ci.location,
  ci.contact,
  ci.price_bwp,
  COALESCE(NULLIF(btrim(ci.directions_link), ''), NULLIF(btrim(p.directions_link), '')) AS directions_link
FROM public.clinic_inventory ci
JOIN public.pharmacies p ON p.name = ci.clinic_name
WHERE p.status = 'active'::public.pharmacy_status
  AND p.visible_in_search = true
  AND p.approved_at IS NOT NULL
  AND ci.quantity > 0
  AND COALESCE(NULLIF(btrim(ci.directions_link), ''), NULLIF(btrim(p.directions_link), '')) ~* '^https?://'
  AND btrim(ci.clinic_name) <> ''
  AND lower(btrim(ci.clinic_name)) <> 'chekameds admin'
  AND lower(ci.clinic_name) NOT LIKE '%chekameds demo%'
  AND lower(ci.clinic_name) NOT LIKE '%demo pharmacy%'
  AND lower(ci.clinic_name) NOT LIKE '%test pharmacy%'
  AND lower(ci.clinic_name) !~ '(^|[[:space:]])test(ing)?([[:space:]]|$)';

GRANT SELECT ON public.active_pharmacy_inventory TO anon, authenticated;
