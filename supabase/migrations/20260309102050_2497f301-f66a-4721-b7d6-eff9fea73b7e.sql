ALTER TABLE public.clinic_inventory
  ADD COLUMN IF NOT EXISTS strength text DEFAULT '',
  ADD COLUMN IF NOT EXISTS dosage_form text DEFAULT '',
  ADD COLUMN IF NOT EXISTS pack_size text DEFAULT '',
  ADD COLUMN IF NOT EXISTS atc_code text DEFAULT '',
  ADD COLUMN IF NOT EXISTS atc_description text DEFAULT '',
  ADD COLUMN IF NOT EXISTS facility_level text DEFAULT '';