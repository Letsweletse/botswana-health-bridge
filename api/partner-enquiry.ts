import { createClient } from '@supabase/supabase-js';

/* Partner / licensing enquiry from /partners.
   1. Validates the form.
   2. Saves it to public.partner_enquiries with the service role.
   3. Sends a WhatsApp alert to the founder through UltraMsg.
   Succeeds if either the save or the alert works, so no lead is lost while
   one of them is misconfigured. */

declare const process: { env: Record<string, string | undefined> };

type ApiResponse = { status: (code: number) => ApiResponse; json: (body: Record<string, unknown>) => void; setHeader: (name: string, value: string | string[]) => void };
type ApiRequest = { method?: string; headers: Record<string, string | string[] | undefined>; body?: unknown };

const json = (res: ApiResponse, status: number, body: Record<string, unknown>) => res.status(status).json(body);
const env = (...names: string[]) => names.map((name) => process.env[name]?.trim()).find(Boolean);
const readBody = (body: unknown): Record<string, unknown> => {
  if (typeof body === 'string') { try { return JSON.parse(body || '{}'); } catch { return {}; } }
  return body && typeof body === 'object' ? body as Record<string, unknown> : {};
};
const str = (value: unknown, max: number) => (typeof value === 'string' ? value.trim().slice(0, max) : '');

const PLANS = new Set(['pilot', 'white_label', 'insights', 'not_sure']);
const CHANNELS = new Set(['whatsapp', 'ussd', 'web']);
const PLAN_LABEL: Record<string, string> = { pilot: 'Powered by ChekaMeds (pilot)', white_label: 'Full White Label', insights: 'Demand Insights', not_sure: 'Not sure yet' };
const ALERT_TO = (env('PARTNER_ALERT_WHATSAPP') || '26775560140').replace(/\D/g, '');

export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader('Allow', ['POST', 'OPTIONS']);
  if (req.method === 'OPTIONS') return json(res, 200, { ok: true });
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  const body = readBody(req.body);

  // Honeypot: real visitors never fill this hidden field.
  if (str(body.website, 200)) return json(res, 200, { ok: true });

  const lead = {
    full_name: str(body.full_name, 120),
    organisation: str(body.organisation, 160),
    job_title: str(body.job_title, 120) || null,
    country: str(body.country, 80),
    email: str(body.email, 200).toLowerCase(),
    phone: str(body.phone, 40) || null,
    organisation_type: str(body.organisation_type, 60) || null,
    pharmacy_count: (() => { const n = Number(body.pharmacy_count); return Number.isFinite(n) && n >= 0 && n <= 100000 ? Math.round(n) : null; })(),
    plan_interest: PLANS.has(str(body.plan_interest, 20)) ? str(body.plan_interest, 20) : 'not_sure',
    channels: Array.isArray(body.channels) ? [...new Set(body.channels.map((c) => str(c, 20)).filter((c) => CHANNELS.has(c)))] : [],
    message: str(body.message, 4000) || null,
    source: str(body.source, 200) || null,
  };

  const errors: string[] = [];
  if (lead.full_name.length < 2) errors.push('full_name');
  if (lead.organisation.length < 2) errors.push('organisation');
  if (lead.country.length < 2) errors.push('country');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(lead.email)) errors.push('email');
  if (errors.length) return json(res, 400, { error: 'Please check the highlighted fields.', fields: errors });

  // 1. WhatsApp alert
  let notified = false;
  const instance = env('ULTRAMSG_INSTANCE_ID');
  const token = env('ULTRAMSG_TOKEN');
  if (instance && token) {
    const text = [
      '🌍 *New ChekaMeds licensing enquiry*',
      '',
      `*${lead.full_name}*${lead.job_title ? `, ${lead.job_title}` : ''}`,
      `${lead.organisation}${lead.organisation_type ? ` (${lead.organisation_type})` : ''}`,
      `Country: ${lead.country}`,
      `Email: ${lead.email}`,
      lead.phone ? `Phone: ${lead.phone}` : '',
      `Plan: ${PLAN_LABEL[lead.plan_interest]}`,
      `Channels: ${lead.channels.length ? lead.channels.join(', ').toUpperCase() : 'not chosen'}`,
      lead.pharmacy_count != null ? `Pharmacies: ${lead.pharmacy_count}` : '',
      lead.message ? `\n"${lead.message.slice(0, 700)}"` : '',
      '',
      'Reply within 24 hours. Full list: chekameds.co.bw/admin',
    ].filter((line) => line !== '').join('\n');
    try {
      const r = await fetch(`https://api.ultramsg.com/${instance}/messages/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, to: ALERT_TO, body: text, priority: 5 }),
      });
      const data = await r.json().catch(() => ({}));
      notified = r.ok && !data?.error && data?.sent !== 'false';
      if (!notified) console.error('partner-enquiry: UltraMsg rejected', JSON.stringify(data).slice(0, 300));
    } catch (e) {
      console.error('partner-enquiry: UltraMsg failed', e);
    }
  }

  // 2. Save
  let stored = false;
  const supabaseUrl = env('SUPABASE_URL', 'VITE_SUPABASE_URL');
  const serviceRoleKey = env('SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SERVICE_KEY', 'SERVICE_ROLE_KEY');
  if (supabaseUrl && serviceRoleKey) {
    try {
      const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
      const { error } = await admin.from('partner_enquiries').insert({ ...lead, notified });
      if (error) console.error('partner-enquiry: insert failed', error.message);
      else stored = true;
    } catch (e) {
      console.error('partner-enquiry: insert threw', e);
    }
  }

  if (!stored && !notified) return json(res, 502, { error: 'We could not send your enquiry. Please WhatsApp us on +267 75 560 140.' });
  return json(res, 200, { ok: true });
}
