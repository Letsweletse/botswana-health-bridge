-- Production stabilization for WhatsApp sessions, directions links, and ChekaPay webhook intake.

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

ALTER TABLE public.clinic_inventory
  ADD COLUMN IF NOT EXISTS directions_link TEXT DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_clinic_inventory_med_name_trgm
  ON public.clinic_inventory USING gin (med_name extensions.gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_clinic_inventory_clinic_name
  ON public.clinic_inventory (clinic_name);

ALTER TABLE public.whatsapp_sessions
  ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'en';

CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_updated_at
  ON public.whatsapp_sessions (updated_at DESC);

CREATE TABLE IF NOT EXISTS public.chekapay_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  payment_id TEXT,
  status TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.chekapay_webhook_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view ChekaPay webhook events" ON public.chekapay_webhook_events;
CREATE POLICY "Admins can view ChekaPay webhook events"
ON public.chekapay_webhook_events
FOR SELECT
TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE INDEX IF NOT EXISTS idx_chekapay_webhook_events_received_at
  ON public.chekapay_webhook_events (received_at DESC);
CREATE INDEX IF NOT EXISTS idx_chekapay_webhook_events_payment_id
  ON public.chekapay_webhook_events (payment_id);
