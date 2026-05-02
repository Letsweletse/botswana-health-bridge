CREATE TABLE public.whatsapp_webhook_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source TEXT NOT NULL DEFAULT 'incoming',
  from_number TEXT,
  message_body TEXT,
  reply_text TEXT,
  response_status INTEGER,
  error_message TEXT,
  raw_payload JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_webhook_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view webhook logs"
ON public.whatsapp_webhook_logs
FOR SELECT
TO authenticated
USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert webhook logs"
ON public.whatsapp_webhook_logs
FOR INSERT
TO authenticated
WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete webhook logs"
ON public.whatsapp_webhook_logs
FOR DELETE
TO authenticated
USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_whatsapp_webhook_logs_created_at ON public.whatsapp_webhook_logs (created_at DESC);