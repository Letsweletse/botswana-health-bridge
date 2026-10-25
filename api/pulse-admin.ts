import { serviceClient, requireAdmin, sendWhatsApp, sendEmail, emailHtml, emailEnabled, SITE } from './_pulse/notify-lib.js';

/* ChekaMeds Pulse – manage alert recipients (ChekaMeds admins only).
   GET                         -> recipients + recent alerts with officer reviews
   POST { action: 'save', subscriber }      -> add or update a recipient
   POST { action: 'active', id, active }    -> switch a recipient on or off
   POST { action: 'test', id }              -> send a test message to a recipient */

type ApiResponse = { status: (code: number) => ApiResponse; json: (body: unknown) => void; setHeader: (n: string, v: string) => void };
type ApiRequest = { method?: string; headers: Record<string, string | string[] | undefined>; body?: unknown };

const ROLES = new Set(['founder', 'dhmt', 'cms', 'moh', 'bomra', 'pharmacy', 'other']);
const str = (v: unknown, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const arr = (v: unknown) => (Array.isArray(v) ? v.map((x) => str(x, 40)).filter(Boolean).slice(0, 30) : []);

function normalisePhone(v: string): string | null {
  const d = v.replace(/\D/g, '');
  if (!d) return null;
  if (d.length === 8) return `267${d}`;
  if (d.length === 11 && d.startsWith('267')) return d;
  return 'invalid';
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader('Cache-Control', 'no-store');
  const sb = serviceClient();
  if (!sb) return res.status(500).json({ error: 'not configured' });
  const admin = await requireAdmin(sb, req.headers.authorization as string | undefined);
  if (!admin.ok) return res.status(401).json({ error: 'Admins only. Please log in with an admin account.' });

  if (req.method === 'GET') {
    const [subs, alerts] = await Promise.all([
      sb.from('pulse_subscribers').select('*').order('created_at', { ascending: true }),
      sb.from('pulse_alerts').select('id,week,town,town_name,grp,label,level,kind,status,status_note,status_by,status_at,notified_at,notified_count,created_at').order('created_at', { ascending: false }).limit(100),
    ]);
    if (subs.error) return res.status(500).json({ error: subs.error.message });
    return res.status(200).json({ subscribers: subs.data, alerts: alerts.data || [], email_enabled: emailEnabled() });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const body: any = typeof req.body === 'string' ? (() => { try { return JSON.parse(req.body as string); } catch { return {}; } })() : (req.body || {});

  if (body.action === 'save') {
    const s = body.subscriber || {};
    const name = str(s.name, 120); const role = str(s.role, 20);
    if (name.length < 2) return res.status(400).json({ error: 'Enter a name.' });
    if (!ROLES.has(role)) return res.status(400).json({ error: 'Choose a role.' });
    const whatsapp = normalisePhone(str(s.whatsapp, 40));
    if (whatsapp === 'invalid') return res.status(400).json({ error: 'WhatsApp number must be a Botswana number, e.g. 71234567.' });
    const email = str(s.email, 160).toLowerCase() || null;
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return res.status(400).json({ error: 'Check the email address.' });
    if (!whatsapp && !email) return res.status(400).json({ error: 'Add a WhatsApp number or an email address.' });
    const row = {
      name, role, organisation: str(s.organisation, 160) || null, whatsapp, email,
      towns: arr(s.towns), groups: arr(s.groups),
      min_level: s.min_level === 'watch' ? 'watch' : 'alert',
      weekly_bulletin: s.weekly_bulletin !== false, active: s.active !== false,
    };
    const q = s.id ? sb.from('pulse_subscribers').update(row).eq('id', str(s.id, 60)) : sb.from('pulse_subscribers').insert(row);
    const { data, error } = await q.select('*').single();
    if (error) return res.status(400).json({ error: error.message });
    return res.status(200).json({ ok: true, subscriber: data });
  }

  if (body.action === 'active') {
    const { data, error } = await sb.from('pulse_subscribers').update({ active: !!body.active }).eq('id', str(body.id, 60)).select('*').single();
    if (error) return res.status(400).json({ error: error.message });
    return res.status(200).json({ ok: true, subscriber: data });
  }

  if (body.action === 'test') {
    const { data: s } = await sb.from('pulse_subscribers').select('*').eq('id', str(body.id, 60)).maybeSingle();
    if (!s) return res.status(404).json({ error: 'Recipient not found.' });
    const result: any = {};
    const text = `✅ *ChekaMeds Pulse test*\nHi ${s.name}, you are set up to receive Pulse ${s.min_level === 'watch' ? 'watch and alert' : 'alert'} messages${s.towns?.length ? ` for ${s.towns.join(', ')}` : ' for all of Botswana'}.\nDashboard: ${SITE}/pulse`;
    if (s.whatsapp) result.whatsapp = await sendWhatsApp(s.whatsapp, text);
    if (s.email && emailEnabled()) {
      result.email = await sendEmail(s.email, 'ChekaMeds Pulse: test message',
        emailHtml('You are set up for Pulse alerts', [`Hi ${s.name},`, `You will receive Pulse ${s.min_level === 'watch' ? 'watch and alert' : 'alert'} messages${s.towns?.length ? ` for ${s.towns.join(', ')}` : ' for all of Botswana'}.`], { label: 'Open Pulse', url: `${SITE}/pulse` }),
        text.replace(/\*/g, ''));
    }
    return res.status(200).json({ ok: true, result });
  }

  return res.status(400).json({ error: 'Unknown action' });
}
