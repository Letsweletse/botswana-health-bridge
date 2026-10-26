import { createHmac } from 'node:crypto';
import { weekKey, lastCompleteWeek, noiseReason, isSensitive, DAY } from './engine.js';
import { TOWNS, townFor, stockTownFor } from './reference.js';
import { env, SITE } from './notify-lib.js';
import { reportUrl } from './report-lib.js';

/* ChekaMeds weekly pharmacy digest: what people searched for last week, and how
   each partner pharmacy's listing is doing. Aggregated counts only: no phone
   numbers, names or individual searches ever appear in a digest. */

// Pharmacies ChekaMeds no longer works with: never sent a digest.
const EXCLUDE = /phase\s*-?\s*4|kganya/i;

const norm = (s: string | null | undefined) => (s || '').toLowerCase().replace(/\s+/g, ' ').trim();
const words = (s: string) => norm(s).split(/[^a-z0-9]+/).filter((w) => w.length >= 4 && !STOP.has(w));
const STOP = new Set(['tablet', 'tablets', 'tabs', 'syrup', 'cream', 'capsule', 'capsules', 'injection', 'drops', 'suspension', 'solution', 'medicine', 'pharmacy', 'where', 'need', 'have', 'with', 'from', 'available', 'price', 'gaborone', 'francistown']);
const title = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase()).replace(/\b(Ors|Arv|Bp|Hiv)\b/g, (m) => m.toUpperCase());
const townName = (id: string | null) => (id ? TOWNS.find((t) => t.id === id)?.name.replace('Greater ', '') || id : null);

export function phoneFor(raw: string | null | undefined): string | null {
  const d = String(raw || '').replace(/\D/g, '');
  if (d.length === 8 && /^7/.test(d)) return `267${d}`;
  if (d.length === 11 && d.startsWith('2677')) return d;
  return null; // landlines and unknown formats are not WhatsApp numbers
}
const emailFor = (raw: string | null | undefined) => {
  const e = norm(raw);
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e) ? e : null;
};

const secret = () => env('PULSE_LINK_SECRET') || `digest:${env('SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SERVICE_KEY', 'SERVICE_ROLE_KEY') || ''}`;
export const unsubSig = (clinic: string) => createHmac('sha256', secret()).update(`unsub.${norm(clinic)}`).digest('base64url').slice(0, 24);
export const unsubUrl = (clinic: string) => `${SITE}/api/pharmacy-digest?unsub=${encodeURIComponent(clinic)}&s=${unsubSig(clinic)}`;

async function fetchAll(sb: any, table: string, cols: string, filter?: (q: any) => any) {
  const out: any[] = [];
  for (let from = 0; from < 100000; from += 1000) {
    let q = sb.from(table).select(cols);
    if (filter) q = filter(q);
    const { data, error } = await q.range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    out.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return out;
}
async function safe<T>(p: Promise<T>, fallback: T): Promise<T> { try { return await p; } catch { return fallback; } }

export type Digest = {
  clinic: string; town: string | null; townName: string | null; whatsapp: string | null; email: string | null; optedOut: boolean;
  week: string; weekLabel: string;
  stock: { listings: number; inStock: number; out: number; lastUpdate: string | null; staleDays: number | null };
  demand: { all: number; town: number | null; national: number; prevNational: number; top: { name: string; n: number }[] };
  missed: { total: number; top: { name: string; n: number }[]; scope: 'town' | 'national' };
  orders: number;
};

export async function buildDigests(sb: any, week = lastCompleteWeek()): Promise<{ week: string; digests: Digest[]; skipped: { clinic: string; reason: string }[] }> {
  const start = new Date(week + 'T00:00:00+02:00').getTime();
  const end = start + 7 * DAY;
  const prevWeek = weekKey(start - 3 * DAY);
  const since = new Date(start - 5 * 7 * DAY).toISOString(); // 5 weeks back, to place searches in a town

  const [pharmacies, stock, logs, optouts, orderReq, delivery, cmOrders] = await Promise.all([
    fetchAll(sb, 'pharmacies', 'clinic_name,contact,email,status,visible_in_search,suspended_at'),
    fetchAll(sb, 'active_pharmacy_inventory', 'clinic_name,med_name,generic_name,brand_name,location,quantity,updated_at,last_verified_at'),
    fetchAll(sb, 'search_logs', 'normalized_query,query,results_count,found,location,user_lat,user_lng,user_phone,created_at', (q) => q.gte('created_at', since).lt('created_at', new Date(end).toISOString())),
    safe(fetchAll(sb, 'pharmacy_digest_optouts', 'clinic_name'), [] as any[]),
    safe(fetchAll(sb, 'order_requests', 'pharmacy,created_at', (q) => q.gte('created_at', new Date(start).toISOString()).lt('created_at', new Date(end).toISOString())), [] as any[]),
    safe(fetchAll(sb, 'medicine_delivery_requests', 'pharmacy_name,created_at', (q) => q.gte('created_at', new Date(start).toISOString()).lt('created_at', new Date(end).toISOString())), [] as any[]),
    safe(fetchAll(sb, 'chekameds_orders', 'pharmacy_name,created_at', (q) => q.gte('created_at', new Date(start).toISOString()).lt('created_at', new Date(end).toISOString())), [] as any[]),
  ]);
  const opted = new Set(optouts.map((o: any) => norm(o.clinic_name)));

  // Clean searches, placed in a town where possible (server side only).
  const phoneTown: Record<string, string> = {};
  for (const r of logs) { const t = townFor(r.location, r.user_lat, r.user_lng); if (t && r.user_phone) phoneTown[r.user_phone] = t; }
  type S = { w: string[]; raw: string; town: string | null; unfilled: boolean; wk: string };
  const searches: S[] = [];
  const seen = new Set<string>();
  for (const r of logs) {
    const raw = norm(r.normalized_query || r.query);
    if (!raw || noiseReason(raw) || isSensitive(raw)) continue;
    const wk = weekKey(r.created_at);
    if (wk !== week && wk !== prevWeek) continue;
    const dedupe = `${r.user_phone || r.created_at}|${raw}|${wk}`; // same person, same medicine, same week counts once
    if (seen.has(dedupe)) continue; seen.add(dedupe);
    const w = words(raw); if (!w.length) continue;
    searches.push({ w, raw, town: townFor(r.location, r.user_lat, r.user_lng) || (r.user_phone ? phoneTown[r.user_phone] : null) || null, unfilled: !r.results_count || r.found === false, wk });
  }

  const allThisWeek = searches.filter((s) => s.wk === week).length;

  // Stock per pharmacy.
  const byClinic = new Map<string, any[]>();
  for (const s of stock) { const k = norm(s.clinic_name); if (!k) continue; (byClinic.get(k) || byClinic.set(k, []).get(k)!).push(s); }
  const countOrders = (name: string) => {
    const k = norm(name);
    return orderReq.filter((o: any) => norm(o.pharmacy) === k).length + delivery.filter((o: any) => norm(o.pharmacy_name) === k).length + cmOrders.filter((o: any) => norm(o.pharmacy_name) === k).length;
  };

  const digests: Digest[] = []; const skipped: { clinic: string; reason: string }[] = [];
  const done = new Set<string>();
  for (const p of pharmacies) {
    const clinic = (p.clinic_name || '').trim();
    const key = norm(clinic);
    if (!clinic || done.has(key)) continue; done.add(key);
    if (EXCLUDE.test(clinic)) { skipped.push({ clinic, reason: 'no longer a partner' }); continue; }
    if (p.suspended_at || p.visible_in_search === false || /suspend|reject|inactive/i.test(p.status || '')) { skipped.push({ clinic, reason: 'not active or not visible in search' }); continue; }
    const whatsapp = phoneFor(p.contact); const email = emailFor(p.email);
    if (!whatsapp && !email) { skipped.push({ clinic, reason: 'no WhatsApp mobile number or email on file' }); continue; }

    const items = byClinic.get(key) || [];
    const vocab = new Set<string>(); const label: Record<string, string> = {};
    const townVotes: Record<string, number> = {};
    let inStock = 0; let last = 0;
    for (const it of items) {
      for (const f of [it.med_name, it.generic_name, it.brand_name]) for (const w of words(f || '')) { vocab.add(w); label[w] ||= title(norm(f).split(' ').slice(0, 2).join(' ')); }
      if ((it.quantity ?? 0) > 0) inStock++;
      const t = stockTownFor(it.clinic_name, it.location); if (t) townVotes[t] = (townVotes[t] || 0) + 1;
      for (const d of [it.updated_at, it.last_verified_at]) { const ms = d ? new Date(d).getTime() : 0; if (ms > last) last = ms; }
    }
    const town = Object.entries(townVotes).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
    const matchWord = (s: S) => s.w.find((w) => vocab.has(w));

    let national = 0; let prevNational = 0; let inTown = 0; const top: Record<string, number> = {};
    const missed: Record<string, { n: number; names: Record<string, number> }> = {}; let missedTotal = 0;
    for (const s of searches) {
      const m = matchWord(s);
      if (s.wk === prevWeek) { if (m) prevNational++; continue; }
      if (m) { national++; if (town && s.town === town) inTown++; top[m] = (top[m] || 0) + 1; }
      const inScope = town ? s.town === town : true;
      if (!m && s.unfilled && inScope) {
        missedTotal++;
        const k = s.w[0]; const e = (missed[k] ||= { n: 0, names: {} }); e.n++; e.names[s.raw] = (e.names[s.raw] || 0) + 1;
      }
    }
    const staleDays = last ? Math.floor((Date.now() - last) / DAY) : null;
    digests.push({
      clinic, town, townName: townName(town), whatsapp, email, optedOut: opted.has(key),
      week, weekLabel: new Date(week + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }),
      stock: { listings: items.length, inStock, out: items.length - inStock, lastUpdate: last ? new Date(last).toISOString() : null, staleDays },
      demand: { all: allThisWeek, town: town ? inTown : null, national, prevNational, top: Object.entries(top).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([w, n]) => ({ name: label[w] || title(w), n })) },
      missed: {
        total: missedTotal, scope: town ? 'town' : 'national',
        top: Object.values(missed).filter((e) => e.n >= 2).sort((a, b) => b.n - a.n).slice(0, 5)
          .map((e) => ({ name: title(Object.entries(e.names).sort((a, b) => b[1] - a[1])[0][0]).slice(0, 40), n: e.n })),
      },
      orders: countOrders(clinic),
    });
  }
  digests.sort((a, b) => a.clinic.localeCompare(b.clinic));
  return { week, digests, skipped };
}

/* ---------- Message text ---------- */

const trend = (now: number, prev: number) => (prev < 5 ? '' : now > prev * 1.15 ? `, up from ${prev}` : now < prev * 0.85 ? `, down from ${prev}` : '');
const where = (d: Digest) => (d.townName ? `in ${d.townName}` : 'across Botswana');

function lines(d: Digest): { head: string; bullets: string[]; nudge: string | null } {
  const b: string[] = [];
  if (d.stock.listings === 0) {
    b.push(`${d.demand.all} medicine searches were made on ChekaMeds last week, but your pharmacy has no medicines listed yet, so you are not showing up in their results.`);
  } else {
    b.push(d.demand.town != null && d.townName
      ? `${d.demand.town} searches ${where(d)} were for medicines you stock (${d.demand.national} across Botswana${trend(d.demand.national, d.demand.prevNational)}).`
      : `${d.demand.national} searches across Botswana were for medicines you stock${trend(d.demand.national, d.demand.prevNational)}.`);
    if (d.demand.top.length) b.push(`Most searched of your medicines: ${d.demand.top.slice(0, 4).map((t) => `${t.name} (${t.n})`).join(', ')}.`);
  }
  if (d.missed.top.length) b.push(`Not found by anyone ${where(d)}: ${d.missed.top.slice(0, 4).map((t) => `${t.name} (${t.n})`).join(', ')}. If you have these, list them and those customers can find you.`);
  if (d.stock.listings > 0) b.push(`Your listing: ${d.stock.inStock.toLocaleString()} of ${d.stock.listings.toLocaleString()} items in stock${d.stock.staleDays != null ? `, last updated ${d.stock.staleDays === 0 ? 'today' : d.stock.staleDays === 1 ? 'yesterday' : `${d.stock.staleDays} days ago`}` : ''}.`);
  if (d.orders > 0) b.push(`${d.orders} order${d.orders === 1 ? '' : 's'} and reservation${d.orders === 1 ? '' : 's'} came through ChekaMeds.`);
  const nudge = d.stock.listings === 0 ? 'Upload your stock list so customers can find you.'
    : (d.stock.staleDays ?? 99) > 14 ? 'Your stock is over two weeks old. Update it so customers see what you have today.'
    : null;
  return { head: `Your ChekaMeds week: ${d.clinic}`, bullets: b, nudge };
}

export function whatsappText(d: Digest): string {
  const l = lines(d);
  return [
    `📊 *Your ChekaMeds week*`,
    `${d.clinic} · week of ${d.weekLabel}`,
    '',
    ...l.bullets.map((x) => `• ${x}`),
    ...(l.nudge ? ['', `⚠️ ${l.nudge}`] : []),
    '',
    `👉 Update your stock: ${SITE}/dashboard`,
    `📈 Your full market report: ${reportUrl(d.clinic, 'current')}`,
    '',
    `_Counts only, no customer details._`,
    `Stop these weekly updates: ${unsubUrl(d.clinic)}`,
  ].join('\n');
}

const esc = (s: string) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

export function emailSubject(d: Digest) {
  return d.stock.listings === 0 ? `${d.demand.all} medicine searches on ChekaMeds last week. Is your stock listed?`
    : `${d.demand.town != null && d.townName ? `${d.demand.town} searches in ${d.townName}` : `${d.demand.national} searches`} for your medicines last week`;
}

export function emailBody(d: Digest): { html: string; text: string } {
  const l = lines(d);
  const kpi = (v: string, k: string) => `<td style="padding:12px 10px;background:#f6f7fa;border-radius:8px;text-align:center;width:33%"><div style="font-size:22px;font-weight:bold;color:#141a33">${esc(v)}</div><div style="font-size:12px;color:#6b7383;margin-top:2px">${esc(k)}</div></td>`;
  const list = (rows: { name: string; n: number }[]) => rows.map((r) => `<tr><td style="padding:6px 0;border-bottom:1px solid #eceef2;font-size:14px">${esc(r.name)}</td><td style="padding:6px 0;border-bottom:1px solid #eceef2;font-size:14px;text-align:right;font-weight:bold">${r.n}</td></tr>`).join('');
  const html = `<!doctype html><html><body style="margin:0;background:#f3f4f7;font-family:Arial,Helvetica,sans-serif;color:#1b1f2a">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f7;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:8px;overflow:hidden">
<tr><td style="background:#141a33;padding:16px 22px;color:#e8b10b;font-size:13px;font-weight:bold;letter-spacing:.04em">CHEKAMEDS · WEEKLY PHARMACY DIGEST</td></tr>
<tr><td style="padding:22px">
<h1 style="margin:0 0 4px;font-size:20px;color:#141a33">${esc(d.clinic)}</h1>
<p style="margin:0 0 18px;font-size:13px;color:#6b7383">Week of ${esc(d.weekLabel)}${d.townName ? ` · ${esc(d.townName)}` : ''}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="6"><tr>
${kpi(String(d.demand.town != null && d.townName ? d.demand.town : d.demand.national), d.demand.town != null && d.townName ? `searches in ${d.townName} for your medicines` : 'searches for your medicines')}
${kpi(`${d.stock.inStock.toLocaleString()}`, `of ${d.stock.listings.toLocaleString()} items in stock`)}
${kpi(d.stock.staleDays == null ? '–' : d.stock.staleDays === 0 ? 'Today' : `${d.stock.staleDays}d`, 'since last stock update')}
</tr></table>
${l.nudge ? `<p style="margin:16px 0 0;padding:12px 14px;background:#fff6dd;border-left:4px solid #e8b10b;font-size:14px">${esc(l.nudge)}</p>` : ''}
${d.demand.top.length ? `<h2 style="margin:22px 0 6px;font-size:15px;color:#141a33">Your most searched medicines</h2><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${list(d.demand.top)}</table>` : ''}
${d.missed.top.length ? `<h2 style="margin:22px 0 2px;font-size:15px;color:#141a33">Searched ${esc(where(d))} but not found</h2><p style="margin:0 0 6px;font-size:13px;color:#6b7383">If you stock these, list them so these customers can find you.</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${list(d.missed.top)}</table>` : ''}
${d.orders > 0 ? `<p style="margin:18px 0 0;font-size:14px">${d.orders} order${d.orders === 1 ? '' : 's'} and reservation${d.orders === 1 ? '' : 's'} came through ChekaMeds this week.</p>` : ''}
<p style="margin:22px 0 6px"><a href="${SITE}/dashboard" style="display:inline-block;background:#e8b10b;color:#141a33;text-decoration:none;font-weight:bold;padding:12px 20px;border-radius:999px;font-size:14px">Open your ChekaMeds dashboard</a></p>
</td></tr>
<tr><td style="padding:14px 22px;border-top:1px solid #eceef2;font-size:11px;color:#8a91a0;line-height:1.5">Counts are from searches on ChekaMeds (WhatsApp and web) last week, Monday to Sunday. They contain no customer names, numbers or individual searches. ChekaMeds · IBLIM Enterprises (Pty) Ltd. <a href="${unsubUrl(d.clinic)}" style="color:#8a91a0">Stop these weekly emails</a>.</td></tr>
</table></td></tr></table></body></html>`;
  const text = [l.head, `Week of ${d.weekLabel}`, '', ...l.bullets.map((x) => `- ${x}`), ...(l.nudge ? ['', l.nudge] : []), '', `Open your dashboard: ${SITE}/dashboard`, '', `Stop these emails: ${unsubUrl(d.clinic)}`].join('\n');
  return { html, text };
}
