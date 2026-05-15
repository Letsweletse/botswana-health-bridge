import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, x-chekapay-signature',
};

function toHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i += 1) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

async function verifyChekaPaySignature(rawBody: string, signatureHeader: string | null): Promise<boolean> {
  const secret = Deno.env.get('CHEKAPAY_WEBHOOK_SECRET');
  if (!secret) throw new Error('CHEKAPAY_WEBHOOK_SECRET is not configured');
  if (!signatureHeader) return false;

  const provided = signatureHeader.trim().replace(/^sha256=/i, '').toLowerCase();
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const digest = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody));
  return timingSafeEqual(toHex(digest), provided);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const rawBody = await req.text();

  try {
    const verified = await verifyChekaPaySignature(rawBody, req.headers.get('x-chekapay-signature'));
    if (!verified) {
      return new Response(JSON.stringify({ error: 'Invalid ChekaPay signature' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload = rawBody ? JSON.parse(rawBody) : {};
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const eventId = String(payload.id || payload.event_id || crypto.randomUUID());
    const eventType = String(payload.type || payload.event || 'unknown');
    const paymentId = payload.payment_id ? String(payload.payment_id) : null;
    const status = payload.status ? String(payload.status) : null;

    const { error } = await supabase.from('chekapay_webhook_events').upsert({
      event_id: eventId,
      event_type: eventType,
      payment_id: paymentId,
      status,
      payload,
      received_at: new Date().toISOString(),
    }, { onConflict: 'event_id' });

    if (error) throw error;

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown ChekaPay webhook error';
    console.error('ChekaPay webhook error:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
