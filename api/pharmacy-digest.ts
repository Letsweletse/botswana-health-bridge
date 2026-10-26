import { serviceClient, requireAdmin, sendWhatsApp, sendEmail, emailEnabled, env } from './_pulse/notify-lib.js';
import { buildDigests, whatsappText, emailSubject, emailBody, unsubSig, phoneFor } from './_pulse/digest-lib.js';
import { loadReportContext, computeReport, reportUrl } from './_pulse/report-lib.js';
import { monthlyWhatsapp, monthlySubject, monthlyEmail } from './_pulse/monthly-lib.js';

/* ChekaMeds weekly pharmacy digest.
   Cron (Mondays 08:00 Gaborone)  -> sends last week's digest to every active partner pharmacy,
                                     once per pharmacy per week, ONLY when sending is switched on.
   GET  ?unsub=<pharmacy>&s=<sig>  -> pharmacy stops receiving digests (signed link in every message).
   Admin (logged-in ChekaMeds admin):
   GET  ?admin=1                   -> previews for every pharmacy + who is skipped and why + send log
   POST { action: 'test', clinic, whatsapp?, email? } -> send ONE pharmacy's digest to the admin's own number/email
   POST { action: 'live', value }  -> switch weekly sending on or off
   POST { action: 'optout' | 'optin', clinic } */

type ApiResponse = { status: (code: number) => ApiResponse; json: (body: unknown) => void; setHeader: (n: string, v: string) => void; send: (b: string) => void };
type ApiRequest = { method?: string; headers: Record<string, string | string[] | undefined>; query?: Record<string, string | string[]>; body?: unknown };
export const maxDuration = 60;

const q = (req: ApiRequest, k: string) => String(req.query?.[k] || '');
const page = (title: string, msg: string) => `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head><body style="margin:0;font-family:Arial,sans-serif;background:#f3f4f7;color:#141a33"><div style="max-width:460px;margin:60px auto;background:#fff;border-radius:12px;padding:28px"><p style="color:#e8b10b;font-weight:bold;font-size:12px;letter-spacing:.05em;margin:0 0 8px">CHEKAMEDS</p><h1 style="font-size:20px;margin:0 0 10px">${title}</h1><p style="font-size:15px;line-height:1.5;margin:0">${msg}</p></div></body></html>`;

async function isLive(sb: any, key = 'live') {
  const { data } = await sb.from('pharmacy_digest_settings').select('value').eq('key', key).maybeSingle();
  return data?.value === true;
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader('Cache-Control', 'no-store');
  const sb = serviceClient();
  if (!sb) return res.status(500).json({ error: 'not configured' });

  /* ---- Unsubscribe link (public, signed) ---- */
  if (req.method === 'GET' && q(req, 'unsub')) {
    const clinic = q(req, 'unsub').slice(0, 160);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    if (q(req, 's') !== unsubSig(clinic)) return res.status(400).send(page('Link not valid', 'This link is incomplete. Please reply to the message and we will stop the updates for you.'));
    await sb.from('pharmacy_digest_optouts').upsert({ clinic_name: clinic, via: 'link' });
    return res.status(200).send(page('You are unsubscribed', `${clinic.replace(/[<>&"]/g, '')} will no longer receive the weekly ChekaMeds digest. Your listing stays live and customers can still find you. To start again, email info@chekameds.co.bw.`));
  }

  /* ---- Admin ---- */
  const auth = String(req.headers.authorization || '');
  const cronSecret = env('CRON_SECRET');
  const isCron = String(req.headers['user-agent'] || '').startsWith('vercel-cron') || (!!cronSecret && auth === `Bearer ${cronSecret}`);

  if (!isCron || q(req, 'admin') === '1' || req.method === 'POST') {
    const admin = await requireAdmin(sb, auth);
    if (!admin.ok) return res.status(401).json({ error: 'Admins only. Please log in with an admin account.' });

    if (req.method === 'GET') {
      const [built, live, liveMonthly, log] = await Promise.all([
        buildDigests(sb),
        isLive(sb).catch(() => false),
        isLive(sb, 'live_monthly').catch(() => false),
        sb.from('pharmacy_digest_log').select('*').order('sent_at', { ascending: false }).limit(200),
      ]);
      const setupNeeded = !!log.error;
      return res.status(200).json({
        week: built.week, live, live_monthly: liveMonthly, setup_needed: setupNeeded, email_enabled: emailEnabled(),
        digests: built.digests.map((d) => ({ ...d, reportUrl: reportUrl(d.clinic), whatsappText: whatsappText(d), emailSubject: emailSubject(d), emailHtml: emailBody(d).html })),
        skipped: built.skipped, log: log.data || [],
      });
    }

    const body: any = typeof req.body === 'string' ? (() => { try { return JSON.parse(req.body as string); } catch { return {}; } })() : (req.body || {});
    if (body.action === 'live') {
      const k = body.kind === 'monthly' ? 'live_monthly' : 'live';
      const { error } = await sb.from('pharmacy_digest_settings').upsert({ key: k, value: !!body.value, updated_at: new Date().toISOString() });
      if (error) return res.status(400).json({ error: error.message });
      return res.status(200).json({ ok: true, kind: k, live: !!body.value });
    }
    if (body.action === 'optout' || body.action === 'optin') {
      const clinic = String(body.clinic || '').slice(0, 160);
      const r = body.action === 'optout'
        ? await sb.from('pharmacy_digest_optouts').upsert({ clinic_name: clinic, via: 'admin' })
        : await sb.from('pharmacy_digest_optouts').delete().eq('clinic_name', clinic);
      if (r.error) return res.status(400).json({ error: r.error.message });
      return res.status(200).json({ ok: true });
    }
    if (body.action === 'test_monthly') {
      // Sends ONE pharmacy's monthly report message to the admin's own number/email, never to the pharmacy.
      const to = phoneFor(body.whatsapp);
      if (body.whatsapp && !to) return res.status(400).json({ error: 'Enter a Botswana mobile number, e.g. 71234567.' });
      const ctx = await loadReportContext(sb);
      const r = computeReport(ctx, String(body.clinic || ''));
      const result: any = {};
      if (to) result.whatsapp = await sendWhatsApp(to, `🧪 TEST (only you received this)\n\n${monthlyWhatsapp(r)}`);
      if (body.email) {
        if (!emailEnabled()) result.email = { ok: false, error: 'email not switched on' };
        else { const e = monthlyEmail(r); result.email = await sendEmail(String(body.email).trim(), `[TEST] ${monthlySubject(r)}`, e.html, e.text); }
      }
      return res.status(200).json({ ok: true, result });
    }
    if (body.action === 'test') {
      // Sends ONE pharmacy's digest to the admin's own number/email, never to the pharmacy.
      const { digests } = await buildDigests(sb);
      const d = digests.find((x) => x.clinic === body.clinic);
      if (!d) return res.status(404).json({ error: 'Pharmacy not found in this week’s list.' });
      const result: any = {};
      const to = phoneFor(body.whatsapp);
      if (body.whatsapp && !to) return res.status(400).json({ error: 'Enter a Botswana mobile number, e.g. 71234567.' });
      if (to) result.whatsapp = await sendWhatsApp(to, `🧪 TEST (only you received this)\n\n${whatsappText(d)}`);
      if (body.email) {
        if (!emailEnabled()) result.email = { ok: false, error: 'email not switched on' };
        else { const e = emailBody(d); result.email = await sendEmail(String(body.email).trim(), `[TEST] ${emailSubject(d)}`, e.html, e.text); }
      }
      return res.status(200).json({ ok: true, result });
    }
    return res.status(400).json({ error: 'Unknown action' });
  }

  /* ---- Weekly run (Vercel Cron) ---- */
  if (cronSecret && auth !== `Bearer ${cronSecret}`) return res.status(401).json({ error: 'unauthorised' });
  if (q(req, 'kind') === 'monthly') return runMonthly(sb, res);
  if (!(await isLive(sb).catch(() => false))) return res.status(200).json({ ok: true, live: false, message: 'Weekly sending is switched off.' });

  const { week, digests } = await buildDigests(sb);
  const sentQ = await sb.from('pharmacy_digest_log').select('clinic_name').eq('week', week).eq('kind', 'weekly');
  const already = new Set((sentQ.data || []).map((r: any) => r.clinic_name));
  const report = { week, sent: 0, skipped_optout: 0, already: 0, failed: 0 };
  for (const d of digests) {
    if (d.optedOut) { report.skipped_optout++; continue; }
    if (already.has(d.clinic)) { report.already++; continue; }
    // Reserve the row first so a retry can never send twice.
    const ins = await sb.from('pharmacy_digest_log').insert({ clinic_name: d.clinic, week, kind: 'weekly' }).select('id').single();
    if (ins.error) { report.already++; continue; }
    const r: any = {};
    if (d.whatsapp) r.whatsapp = await sendWhatsApp(d.whatsapp, whatsappText(d));
    if (d.email && emailEnabled()) { const e = emailBody(d); r.email = await sendEmail(d.email, emailSubject(d), e.html, e.text); }
    const ok = !!(r.whatsapp?.ok || r.email?.ok);
    await sb.from('pharmacy_digest_log').update({
      whatsapp_ok: r.whatsapp ? r.whatsapp.ok : null, email_ok: r.email ? r.email.ok : null,
      error: ok ? null : [r.whatsapp?.error, r.email?.error].filter(Boolean).join(' | ').slice(0, 300) || 'no channel',
    }).eq('id', ins.data.id);
    ok ? report.sent++ : report.failed++;
    await new Promise((s) => setTimeout(s, 400)); // gentle on the WhatsApp gateway
  }
  return res.status(200).json({ ok: true, live: true, ...report });
}

/* ---- Monthly run (1st of the month, 08:00): headline + link to the full report ---- */
async function runMonthly(sb: any, res: ApiResponse) {
  if (!(await isLive(sb, 'live_monthly').catch(() => false))) return res.status(200).json({ ok: true, live: false, message: 'Monthly sending is switched off.' });
  const [{ digests }, ctx] = await Promise.all([buildDigests(sb), loadReportContext(sb)]);
  const period = `${ctx.B.month}-01`;
  const sentQ = await sb.from('pharmacy_digest_log').select('clinic_name').eq('week', period).eq('kind', 'monthly');
  const already = new Set((sentQ.data || []).map((r: any) => r.clinic_name));
  const report = { month: ctx.B.month, sent: 0, skipped_optout: 0, already: 0, failed: 0 };
  for (const d of digests) {
    if (d.optedOut) { report.skipped_optout++; continue; }
    if (already.has(d.clinic)) { report.already++; continue; }
    const ins = await sb.from('pharmacy_digest_log').insert({ clinic_name: d.clinic, week: period, kind: 'monthly' }).select('id').single();
    if (ins.error) { report.already++; continue; }
    const r = computeReport(ctx, d.clinic);
    const out: any = {};
    if (d.whatsapp) out.whatsapp = await sendWhatsApp(d.whatsapp, monthlyWhatsapp(r));
    if (d.email && emailEnabled()) { const e = monthlyEmail(r); out.email = await sendEmail(d.email, monthlySubject(r), e.html, e.text); }
    const ok = !!(out.whatsapp?.ok || out.email?.ok);
    await sb.from('pharmacy_digest_log').update({
      whatsapp_ok: out.whatsapp ? out.whatsapp.ok : null, email_ok: out.email ? out.email.ok : null,
      error: ok ? null : [out.whatsapp?.error, out.email?.error].filter(Boolean).join(' | ').slice(0, 300) || 'no channel',
    }).eq('id', ins.data.id);
    ok ? report.sent++ : report.failed++;
    await new Promise((s) => setTimeout(s, 400));
  }
  return res.status(200).json({ ok: true, live: true, ...report });
}
