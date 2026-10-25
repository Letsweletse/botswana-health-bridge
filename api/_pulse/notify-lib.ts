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

/* Email through Resend. Active only when RESEND_API_KEY is set and the sending
   domain (PULSE_EMAIL_FROM, default alerts@chekameds.co.bw) is verified in Resend. */
export const emailEnabled = () => !!env('RESEND_API_KEY');
export async function sendEmail(to: string, subject: string, html: string, text: string): Promise<{ ok: boolean; error?: string }> {
  const key = env('RESEND_API_KEY');
  if (!key) return { ok: false, error: 'RESEND_API_KEY not set' };
  const from = env('PULSE_EMAIL_FROM') || 'ChekaMeds Pulse <alerts@chekameds.co.bw>';
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [to], subject, html, text, reply_to: 'info@chekameds.co.bw' }),
    });
    const d: any = await r.json().catch(() => ({}));
    return r.ok && d?.id ? { ok: true } : { ok: false, error: JSON.stringify(d).slice(0, 200) };
  } catch (e) { return { ok: false, error: String((e as Error).message || e) }; }
}

const esc = (s: string) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

/* Plain, client-safe HTML email (works in Outlook and Gmail). */
export function emailHtml(title: string, lines: string[], cta?: { label: string; url: string }, note?: string): string {
  return `<!doctype html><html><body style="margin:0;background:#f3f4f7;font-family:Arial,Helvetica,sans-serif;color:#1b1f2a">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f7;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:8px;overflow:hidden">
<tr><td style="background:#141a33;padding:16px 22px;color:#e8b10b;font-size:13px;font-weight:bold;letter-spacing:.04em">CHEKAMEDS PULSE</td></tr>
<tr><td style="padding:22px">
<h1 style="margin:0 0 12px;font-size:20px;color:#141a33">${esc(title)}</h1>
${lines.map((l) => `<p style="margin:0 0 10px;font-size:14px;line-height:1.5">${esc(l)}</p>`).join('')}
${cta ? `<p style="margin:18px 0 6px"><a href="${cta.url}" style="display:inline-block;background:#e8b10b;color:#141a33;text-decoration:none;font-weight:bold;padding:11px 18px;border-radius:999px;font-size:14px">${esc(cta.label)}</a></p>` : ''}
${note ? `<p style="margin:16px 0 0;font-size:12px;color:#6b7383">${esc(note)}</p>` : ''}
</td></tr>
<tr><td style="padding:14px 22px;border-top:1px solid #eceef2;font-size:11px;color:#8a91a0">ChekaMeds Pulse · IBLIM Enterprises (Pty) Ltd · Aggregated data only. To stop these emails, reply STOP.</td></tr>
</table></td></tr></table></body></html>`;
}

/* Verify a logged-in ChekaMeds admin from the Supabase access token. */
export async function requireAdmin(sb: any, authHeader: string | undefined): Promise<{ ok: true; userId: string; email: string } | { ok: false }> {
  const token = String(authHeader || '').replace(/^Bearer\s+/i, '');
  if (!token) return { ok: false };
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data?.user) return { ok: false };
  const { data: role } = await sb.from('user_roles').select('role').eq('user_id', data.user.id).eq('role', 'admin').maybeSingle();
  return role ? { ok: true, userId: data.user.id, email: data.user.email || '' } : { ok: false };
}
