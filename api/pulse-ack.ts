import { serviceClient, verify } from './_pulse/notify-lib.js';

/* ChekaMeds Pulse – acknowledge an alert from a signed WhatsApp link.
   GET  ?a=<alert id>&by=<subscriber id>&s=<signature>  -> alert details
   POST { a, by, s, status, note }                       -> record the officer's verdict */

type ApiResponse = { status: (code: number) => ApiResponse; json: (body: unknown) => void; setHeader: (n: string, v: string) => void };
type ApiRequest = { method?: string; query?: Record<string, string | string[]>; body?: unknown };

const STATUSES = new Set(['checked', 'confirmed', 'false_alarm']);
const one = (v: unknown) => (Array.isArray(v) ? String(v[0] ?? '') : String(v ?? ''));

export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader('Cache-Control', 'no-store');
  const sb = serviceClient();
  if (!sb) return res.status(500).json({ error: 'not configured' });

  const input: any = req.method === 'POST'
    ? (typeof req.body === 'string' ? (() => { try { return JSON.parse(req.body as string); } catch { return {}; } })() : (req.body || {}))
    : (req.query || {});
  const a = one(input.a); const by = one(input.by); const s = one(input.s);
  if (!verify(a, by, s)) return res.status(403).json({ error: 'This link is not valid.' });

  const [alertQ, subQ] = await Promise.all([
    sb.from('pulse_alerts').select('id,week,town_name,label,level,kind,reasons,action,owner,status,status_note,status_by,status_at').eq('id', a).maybeSingle(),
    sb.from('pulse_subscribers').select('name,organisation,role').eq('id', by).maybeSingle(),
  ]);
  if (!alertQ.data) return res.status(404).json({ error: 'Alert not found.' });

  if (req.method === 'POST') {
    const status = one(input.status);
    if (!STATUSES.has(status)) return res.status(400).json({ error: 'Choose checked, confirmed or false alarm.' });
    const who = subQ.data ? `${subQ.data.name}${subQ.data.organisation ? `, ${subQ.data.organisation}` : ''}` : 'Unknown';
    const up = await sb.from('pulse_alerts').update({
      status, status_note: one(input.note).slice(0, 500) || null, status_by: who, status_at: new Date().toISOString(),
    }).eq('id', a).select('status,status_note,status_by,status_at').single();
    if (up.error) return res.status(500).json({ error: 'Could not save. Please try again.' });
    return res.status(200).json({ ok: true, alert: { ...alertQ.data, ...up.data } });
  }
  return res.status(200).json({ ok: true, alert: alertQ.data, you: subQ.data?.name || null });
}
