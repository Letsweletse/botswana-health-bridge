import { createHmac, timingSafeEqual } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

/* Shared helpers for Pulse alert delivery and acknowledgement. Server only. */

declare const process: { env: Record<string, string | undefined> };
export const env = (...names: string[]) => names.map((n) => process.env[n]?.trim()).find(Boolean);

export function serviceClient() {
  const url = env('SUPABASE_URL', 'VITE_SUPABASE_URL');
  const key = env('SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SERVICE_KEY', 'SERVICE_ROLE_KEY');
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

/* Signed acknowledgement links: only the person a link was sent to can mark that alert. */
const secret = () => env('PULSE_LINK_SECRET') || `pulse:${env('SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SERVICE_KEY', 'SERVICE_ROLE_KEY') || ''}`;
export function sign(alertId: string, subscriberId: string): string {
  return createHmac('sha256', secret()).update(`${alertId}.${subscriberId}`).digest('base64url').slice(0, 32);
}
export function verify(alertId: string, subscriberId: string, sig: string): boolean {
  if (!alertId || !subscriberId || !sig) return false;
  const a = Buffer.from(sign(alertId, subscriberId)); const b = Buffer.from(String(sig));
  return a.length === b.length && timingSafeEqual(a, b);
}

/* UltraMsg instance id, with the same guard the WhatsApp bot uses against a token
   pasted into the instance-id variable. */
function instanceId(): string {
  const raw = (env('ULTRAMSG_INSTANCE_ID', 'ULTRAMSG_INSTANCE') || '').trim();
  if (/^instance\d+$/.test(raw)) return raw;
  if (/^\d+$/.test(raw)) return `instance${raw}`;
  return 'instance114633';
}

export async function sendWhatsApp(to: string, body: string): Promise<{ ok: boolean; error?: string }> {
  const token = env('ULTRAMSG_TOKEN');
  if (!token) return { ok: false, error: 'ULTRAMSG_TOKEN not set' };
  try {
    const r = await fetch(`https://api.ultramsg.com/${instanceId()}/messages/chat`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, to, body, priority: 5 }),
    });
    const d: any = await r.json().catch(() => ({}));
    const ok = r.ok && !d?.error && d?.sent !== 'false';
    return ok ? { ok } : { ok, error: JSON.stringify(d).slice(0, 200) };
  } catch (e) {
    return { ok: false, error: String((e as Error).message || e) };
  }
}

export const SITE = 'https://www.chekameds.co.bw';
