
-- Create clinic_inventory table
CREATE TABLE public.clinic_inventory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_name TEXT NOT NULL,
  med_name TEXT NOT NULL,
  category TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  trend TEXT DEFAULT 'Stable',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.clinic_inventory ENABLE ROW LEVEL SECURITY;

-- Public read access (WhatsApp bot + dashboard)
CREATE POLICY "Anyone can read inventory"
  ON public.clinic_inventory FOR SELECT
  USING (true);

-- Authenticated users can manage inventory
CREATE POLICY "Authenticated users can insert"
  ON public.clinic_inventory FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update"
  ON public.clinic_inventory FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete"
  ON public.clinic_inventory FOR DELETE
  USING (auth.role() = 'authenticated');

-- Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION public.update_inventory_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_clinic_inventory_timestamp
  BEFORE UPDATE ON public.clinic_inventory
  FOR EACH ROW
  EXECUTE FUNCTION public.update_inventory_timestamp();
