import { serviceClient, sendWhatsApp, sendEmail, emailHtml, emailEnabled, sign, env, SITE } from './_pulse/notify-lib.js';

/* ChekaMeds Pulse – alert delivery (runs daily from Vercel Cron, 08:00 Gaborone).
   1. Reads this week's live alerts from /api/pulse.
   2. Records each in pulse_alerts once (week + place + signal group).
   3. Sends each NEW alert by WhatsApp to matching subscribers, with a signed link
      to mark it checked / confirmed / false alarm.
   4. On Tuesdays, sends the weekly bulletin link (once per subscriber per week).
   ?dry=1 shows what would be sent without sending or saving anything
   (recipients shown by role only; acknowledgement links are withheld). */

type ApiResponse = { status: (code: number) => ApiResponse; json: (body: unknown) => void; setHeader: (n: string, v: string) => void };
type ApiRequest = { method?: string; headers: Record<string, string | string[] | undefined>; query?: Record<string, string | string[]> };
export const maxDuration = 60;

const rank = (l: string) => (l === 'alert' ? 2 : l === 'watch' ? 1 : 0);

export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader('Cache-Control', 'no-store');
  const dry = String(req.query?.dry || '') === '1';

  // Vercel Cron sends "Authorization: Bearer <CRON_SECRET>" when CRON_SECRET is set.
  // Without it, anyone could only trigger the same idempotent run (each alert is sent once).
  const cronSecret = env('CRON_SECRET');
  if (cronSecret && !dry && req.headers.authorization !== `Bearer ${cronSecret}`) return res.status(401).json({ error: 'unauthorised' });

  const sb = serviceClient();
  if (!sb) return res.status(500).json({ error: 'not configured' });

  const pulse = await fetch(`${SITE}/api/pulse`).then((r) => r.json()).catch(() => null);
  if (!pulse?.live) return res.status(502).json({ error: 'pulse data unavailable' });
  const alerts: any[] = pulse.live.alerts || [];
  const week: string = pulse.week;

  const subsQ = await sb.from('pulse_subscribers').select('*').eq('active', true);
  if (subsQ.error) {
    // Tables not created yet: report clearly, do nothing.
    return res.status(200).json({ ok: false, setup_needed: true, message: 'Run the Pulse alerting SQL in Supabase first.', error: subsQ.error.message, alerts: alerts.length });
  }
  const subs: any[] = subsQ.data || [];

  const existingQ = await sb.from('pulse_alerts').select('id,town,grp,notified_at').eq('week', week);
  const existing = new Map((existingQ.data || []).map((r: any) => [`${r.town}|${r.grp}`, r]));

  const report: any = { week, alerts: alerts.length, new: 0, sent: 0, failed: 0, bulletin_sent: 0, dry, deliveries: [] as any[] };

  for (const a of alerts) {
    const key = `${a.town}|${a.group}`;
    let row: any = existing.get(key);
    if (!row) {
      if (dry) row = { id: 'dry-run', notified_at: null };
      else {
        const ins = await sb.from('pulse_alerts').insert({
          week, town: a.town, town_name: a.townName, grp: a.group, label: a.label, level: a.level, kind: a.kind,
          score: a.score, reasons: a.reasons, action: a.action, owner: a.owner,
        }).select('id,notified_at').single();
        if (ins.error) { report.failed++; report.deliveries.push({ alert: key, error: ins.error.message }); continue; }
        row = ins.data;
      }
      report.new++;
    }
    if (row.notified_at) continue; // already delivered this week

    const useEmail = emailEnabled();
    const targets = subs.filter((s) => (s.whatsapp || (useEmail && s.email))
      && rank(a.level) >= rank(s.min_level || 'alert')
      && (!s.towns?.length || (a.town !== 'botswana' && s.towns.includes(a.town)))
      && (!s.groups?.length || s.groups.includes(a.group)));

    let delivered = 0;
    for (const s of targets) {
      const link = `${SITE}/pulse/ack?a=${row.id}&by=${s.id}&s=${sign(row.id, s.id)}`;
      const body = [
        `${a.level === 'alert' ? '🔴' : '🟡'} *ChekaMeds Pulse ${a.level === 'alert' ? 'alert' : 'watch'}*`,
        `*${a.label}* · ${a.townName}`,
        '',
        ...a.reasons.slice(0, 3).map((r: string) => `• ${r}`),
        '',
        `*Suggested action:* ${a.action}`,
        `*Responsible:* ${a.owner}`,
        '',
        `Please verify with clinic and stock data, then mark it:`,
        link,
        '',
        `_A prompt to check, not a diagnosis. Aggregated data only._`,
      ].join('\n');
      if (dry) { report.deliveries.push({ alert: key, to: s.role, preview: body.replace(link, `${SITE}/pulse/ack?…(signed link)`) }); delivered++; continue; }
      let reached = false;
      if (s.whatsapp) {
        const r = await sendWhatsApp(s.whatsapp, body);
        report.deliveries.push({ alert: key, to: s.role, channel: 'whatsapp', ok: r.ok, error: r.error });
        if (r.ok) reached = true;
      }
      if (useEmail && s.email) {
        const subject = `Pulse ${a.level === 'alert' ? 'alert' : 'watch'}: ${a.label}, ${a.townName}`;
        const html = emailHtml(`${a.label} · ${a.townName}`, [...a.reasons.slice(0, 3), `Suggested action: ${a.action}`, `Responsible: ${a.owner}`],
          { label: 'Review this alert', url: link }, 'A prompt to check, not a diagnosis. Aggregated data only.');
        const r = await sendEmail(s.email, subject, html, body.replace(/\*/g, ''));
        report.deliveries.push({ alert: key, to: s.role, channel: 'email', ok: r.ok, error: r.error });
        if (r.ok) reached = true;
      }
      if (reached) { delivered++; report.sent++; } else report.failed++;
    }
    if (!dry && (delivered > 0 || targets.length === 0)) {
      await sb.from('pulse_alerts').update({ notified_at: new Date().toISOString(), notified_count: delivered }).eq('id', row.id);
    }
  }

  // Weekly bulletin on Tuesdays (Gaborone time), once per subscriber per week.
  const gabDay = new Date(Date.now() + 2 * 3600e3).getUTCDay();
  if (gabDay === 2 || String(req.query?.bulletin || '') === '1') {
    const n = alerts.filter((a) => a.level === 'alert').length; const w = alerts.length - n;
    const useEmailB = emailEnabled();
    for (const s of subs.filter((x) => x.weekly_bulletin && (x.whatsapp || (useEmailB && x.email)) && x.last_bulletin !== week)) {
      const body = [
        `📋 *ChekaMeds Pulse weekly bulletin*`,
        `Week of ${new Date(week + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })}`,
        '',
        `${n} alert${n === 1 ? '' : 's'} · ${w} on watch`,
        ...alerts.slice(0, 5).map((a) => `• ${a.level === 'alert' ? '🔴' : '🟡'} ${a.label}, ${a.townName}`),
        '',
        `Full bulletin (print or PDF) and DHIS2 data file:`,
        `${SITE}/pulse/bulletin`,
      ].join('\n');
      if (dry) { report.deliveries.push({ bulletin: true, to: s.role, preview: body }); continue; }
      let ok = false; const errs: string[] = [];
      if (s.whatsapp) { const r = await sendWhatsApp(s.whatsapp, body); ok = ok || r.ok; if (!r.ok && r.error) errs.push(r.error); }
      if (useEmailB && s.email) {
        const html = emailHtml('Pulse weekly bulletin', [body.split('\n')[1], `${n} alert${n === 1 ? '' : 's'} · ${w} on watch`, ...alerts.slice(0, 5).map((a) => `${a.level === 'alert' ? 'Alert' : 'Watch'}: ${a.label}, ${a.townName}`)],
          { label: 'Open the bulletin', url: `${SITE}/pulse/bulletin` }, 'Printable PDF and DHIS2 data file on the bulletin page.');
        const r = await sendEmail(s.email, 'ChekaMeds Pulse weekly bulletin', html, body.replace(/\*/g, ''));
        ok = ok || r.ok; if (!r.ok && r.error) errs.push(r.error);
      }
      if (ok) { report.bulletin_sent++; await sb.from('pulse_subscribers').update({ last_bulletin: week }).eq('id', s.id); }
      else report.deliveries.push({ bulletin: true, to: s.role, ok: false, error: errs.join(' | ') });
    }
  }

  // Consolidated national monthly bulletin on the 1st (Gaborone time), once per subscriber per month.
  const gab = new Date(Date.now() + 2 * 3600e3);
  if (gab.getUTCDate() === 1 || String(req.query?.monthly || '') === '1') {
    report.monthly_sent = 0;
    const nat = await fetch(`${SITE}/api/pulse-monthly`).then((r) => r.json()).catch(() => null);
    if (nat?.headline) {
      const period = `${nat.month}-01`;
      const h = nat.headline; const net = nat.network || {};
      const chg = (v: number | null) => (v == null ? '' : ` (${v > 0 ? '▲' : '▼'} ${Math.abs(v)}% on ${nat.prevMonthLabel})`);
      const body = [
        `📊 *ChekaMeds Pulse: national monthly bulletin*`,
        nat.monthLabel,
        '',
        `• ${h.townSearches.toLocaleString('en-GB')} medicine searches across Botswana${chg(h.townSearchesChange)}`,
        `• ${h.notFoundShare}% found nothing at any pharmacy`,
        net.pharmacies ? `• ${net.pharmacies} pharmacies sharing stock, ${net.freshShare}% updated in the last 14 days` : null,
        nat.medicines?.length ? `• Most searched: ${nat.medicines.slice(0, 3).map((m: any) => m.name).join(', ')}` : null,
        nat.missed?.length ? `• Unmet demand: ${nat.missed.slice(0, 3).map((m: any) => m.name).join(', ')}` : null,
        net.underserved?.length ? `• Underserved towns: ${net.underserved.join(', ')}` : null,
        '',
        `Full bulletin (town by town, top medicines, when people search):`,
        `${SITE}/pulse/monthly?m=${nat.month}`,
      ].filter((l) => l !== null).join('\n');
      const useEmailM = emailEnabled();
      for (const s of subs.filter((x) => x.weekly_bulletin && (x.whatsapp || (useEmailM && x.email)))) {
        if (dry) { report.deliveries.push({ monthly: true, to: s.role, preview: body }); continue; }
        // Reserve once per subscriber per month (shared send log; unique on name + period + kind).
        const ins = await sb.from('pharmacy_digest_log').insert({ clinic_name: `pulse-sub:${s.id}`, week: period, kind: 'pulse_monthly' }).select('id').single();
        if (ins.error) continue;
        let ok = false;
        if (s.whatsapp) ok = (await sendWhatsApp(s.whatsapp, body)).ok || ok;
        if (useEmailM && s.email) {
          const html = emailHtml(`Pulse national bulletin: ${nat.monthLabel}`, body.split('\n').slice(2, -3).filter(Boolean).map((l) => l.replace(/^• /, '')), { label: 'Open the full bulletin', url: `${SITE}/pulse/monthly?m=${nat.month}` });
          ok = (await sendEmail(s.email, `ChekaMeds Pulse national bulletin: ${nat.monthLabel}`, html, body.replace(/\*/g, ''))).ok || ok;
        }
        await sb.from('pharmacy_digest_log').update({ whatsapp_ok: ok }).eq('id', ins.data.id);
        if (ok) report.monthly_sent++;
      }
    }
  }

  return res.status(200).json({ ok: true, ...report });
}
