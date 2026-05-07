
CREATE TABLE IF NOT EXISTS public.whatsapp_sessions (
  from_number text PRIMARY KEY,
  medicine text,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  selected jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.whatsapp_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view sessions" ON public.whatsapp_sessions FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role));
