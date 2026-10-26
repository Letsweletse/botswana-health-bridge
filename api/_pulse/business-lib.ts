import { createHmac } from 'node:crypto';
import { noiseReason, isSensitive, DAY } from './engine.js';
import { TOWNS, GROUPS, townFor, stockTownFor, textTownFor, groupFor } from './reference.js';
import { env, SITE } from './notify-lib.js';
import { norm, words, title, pctChange, median, HIDE, type ReportContext } from './report-lib.js';

/* ChekaMeds business engagement report: one report for a whole pharmacy business
   (all branches whose name starts with the business name, e.g. "Pulse Pharmacy").
   Real data only. Aggregated: no customer names, numbers or individual searches. */

const TZ = 2 * 3600e3;
// Medicine names are shown from 1 search: lists carry no person, time or place, and sensitive medicines are never named.
const MIN_NAMED = 1;

const secret = () => env('PULSE_LINK_SECRET') || `business:${env('SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SERVICE_KEY', 'SERVICE_ROLE_KEY') || ''}`;
export const businessSig = (b: string) => createHmac('sha256', secret()).update(`business.${norm(b)}`).digest('base64url').slice(0, 24);
export const businessUrl = (b: string, month?: string) => `${SITE}/business?b=${encodeURIComponent(b)}&s=${businessSig(b)}${month ? `&m=${month}` : ''}`;

/** Businesses with 2 or more branches on ChekaMeds (name prefix shared by 2+ pharmacies). */
export function listBusinesses(stock: any[]): { name: string; branches: number }[] {
  const names = [...new Set(stock.map((s: any) => String(s.clinic_name || '').trim()).filter((n) => n && !HIDE.test(n)))];
  const groups: Record<string, string[]> = {};
  for (const n of names) { const k = n.split(/\s+/).slice(0, 2).join(' '); (groups[k.toLowerCase()] ||= []).push(n); }
  return Object.values(groups).filter((g) => g.length >= 2).map((g) => ({ name: g[0].split(/\s+/).slice(0, 2).join(' '), branches: g.length })).sort((a, b) => b.branches - a.branches);
}

export function computeBusiness(ctx: ReportContext, business: string) {
  const { B, stock, logs, pulse, orderReq, delivery, cmOrders, impressions } = ctx as any;
  const bkey = norm(business);
  const isMine = (name: string) => norm(name).startsWith(bkey);

  /* ---- Branches ---- */
  type Branch = { key: string; name: string; short: string; town: string | null; listings: number; meds: Set<string>; last: number; prices: Map<string, number> };
  const branches = new Map<string, Branch>();
  const competitorVocab = new Map<string, { pharmacies: Set<string>; prices: Map<string, number> }>();
  for (const it of stock) {
    const name = String(it.clinic_name || '').trim(); const k = norm(name);
    if (!k || HIDE.test(k)) continue;
    const ws = new Set<string>(); for (const f of [it.med_name, it.generic_name, it.brand_name]) for (const w of words(f || '')) ws.add(w);
    if (isMine(name)) {
      const b = branches.get(k) || { key: k, name, short: name.slice(business.length).trim() || name, town: stockTownFor(name, it.location), listings: 0, meds: new Set(), last: 0, prices: new Map() };
      b.listings++; ws.forEach((w) => b.meds.add(w));
      for (const d of [it.updated_at, it.last_verified_at]) { const ms = d ? Date.parse(d) : 0; if (ms > b.last) b.last = ms; }
      if (it.price_bwp > 0) for (const w of ws) { const p = b.prices.get(w); if (p == null || it.price_bwp < p) b.prices.set(w, Number(it.price_bwp)); }
      branches.set(k, b);
    } else if ((it.quantity ?? 0) > 0) {
      for (const w of ws) {
        const e = competitorVocab.get(w) || { pharmacies: new Set(), prices: new Map() };
        e.pharmacies.add(k);
        if (it.price_bwp > 0) { const p = e.prices.get(k); if (p == null || it.price_bwp < p) e.prices.set(k, Number(it.price_bwp)); }
        competitorVocab.set(w, e);
      }
    }
  }
  const myKeys = new Set(branches.keys());
  const chainVocab = new Set<string>(); branches.forEach((b) => b.meds.forEach((w) => chainVocab.add(w)));

  /* ---- Searches (deduped: same person, same medicine, same day counts once) ---- */
  type S = { raw: string; w: string[]; t: number; town: string | null; phone: string | null; unfilled: boolean; shown: string[]; sensitive: boolean; channel: string; group: string };
  const phoneTown: Record<string, string> = {};
  const placeOf = (r: any) => townFor(r.location, r.user_lat, r.user_lng) || textTownFor(r.query) || textTownFor(r.normalized_query);
  for (const r of logs) { const t = placeOf(r); if (t && r.user_phone) phoneTown[r.user_phone] = t; }
  const cur: S[] = []; const prev: S[] = []; const seen = new Set<string>(); const phonesBefore = new Set<string>();
  for (const r of logs) {
    const t = Date.parse(r.created_at); const raw = norm(r.normalized_query || r.query);
    if (!raw || noiseReason(raw)) continue;
    if (t < B.start && r.user_phone) phonesBefore.add(r.user_phone);
    const bucket = t >= B.start && t < B.end ? cur : t >= B.prevStart && t < B.prevEnd ? prev : null;
    if (!bucket) continue;
    const dk = `${r.user_phone || r.created_at}|${raw}|${Math.floor((t + TZ) / DAY)}`;
    if (seen.has(dk)) continue; seen.add(dk);
    bucket.push({
      raw, w: words(raw), t, town: placeOf(r) || (r.user_phone ? phoneTown[r.user_phone] : null) || null, phone: r.user_phone || null,
      unfilled: !r.results_count || r.found === false, shown: Array.isArray(r.matched_pharmacies) ? r.matched_pharmacies.map((x: any) => norm(String(x))) : [],
      sensitive: isSensitive(raw), channel: String(r.source || 'web').startsWith('whatsapp') ? 'WhatsApp' : 'Web',
      group: isSensitive(raw) ? 'srh' : groupFor(raw),
    });
  }
  const showsUs = (s: S) => s.shown.some((k) => myKeys.has(k));
  const seenCur = cur.filter(showsUs); const seenPrev = prev.filter(showsUs);
  const trackedCur = cur.filter((s) => s.shown.length > 0 || s.unfilled); // searches where results were logged
  const shareOfVoice = trackedCur.length ? Math.round((seenCur.length / trackedCur.length) * 100) : 0;
  const people = new Set(seenCur.map((s) => s.phone).filter(Boolean) as string[]);
  const imp = impressions.filter((i: any) => myKeys.has(norm(i.pharmacy_name)));
  const taps = imp.filter((i: any) => i.selected).length; const reserves = imp.filter((i: any) => i.reserved).length;
  const orders = [orderReq, delivery, cmOrders].reduce((n: number, list: any[]) => n + list.filter((o: any) => myKeys.has(norm(o.pharmacy || o.pharmacy_name))).length, 0);

  // Lost to competitors: they searched a medicine the business lists, results showed other pharmacies, none of ours.
  const lost = cur.filter((s) => !s.sensitive && !showsUs(s) && s.shown.length > 0 && s.w.some((w) => chainVocab.has(w)));
  // Unmet: nobody had it, and the business doesn't list it either.
  const unmet = cur.filter((s) => !s.sensitive && s.unfilled && !s.w.some((w) => chainVocab.has(w)));

  /* ---- Branch league ---- */
  const league = [...branches.values()].map((b) => {
    const n = seenCur.filter((s) => s.shown.includes(b.key)).length; const p = seenPrev.filter((s) => s.shown.includes(b.key)).length;
    const bi = imp.filter((i: any) => norm(i.pharmacy_name) === b.key);
    return {
      branch: b.short, town: b.town ? TOWNS.find((t) => t.id === b.town)?.name.replace('Greater ', '') || b.town : '–',
      shown: n, change: pctChange(n, p), taps: bi.filter((i: any) => i.selected).length, reserves: bi.filter((i: any) => i.reserved).length,
      listings: b.listings, staleDays: b.last ? Math.floor((Date.now() - b.last) / DAY) : null,
    };
  }).sort((a, b) => b.shown - a.shown || b.listings - a.listings);

  /* ---- Daily, timing, origins ---- */
  const days = Math.max(1, Math.ceil((B.end - B.start) / DAY));
  const daily = Array.from({ length: days }, (_, i) => ({ day: i + 1, label: `${i + 1}`, searches: 0, yours: 0 }));
  for (const s of cur) { const i = Math.floor((s.t - B.start) / DAY); if (daily[i]) { daily[i].searches++; if (showsUs(s)) daily[i].yours++; } }
  const heat = Array.from({ length: 7 }, () => Array(24).fill(0));
  for (const s of seenCur) { const d = new Date(s.t + TZ); heat[(d.getUTCDay() + 6) % 7][d.getUTCHours()]++; }
  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const dayT = heat.map((r) => r.reduce((a, b) => a + b, 0)); const hourT = Array.from({ length: 24 }, (_, h) => heat.reduce((a, r) => a + r[h], 0));
  const origins: Record<string, number> = {};
  for (const s of seenCur) { const k = s.town || 'unknown'; origins[k] = (origins[k] || 0) + 1; }

  /* ---- Medicines ---- */
  const tally = (list: S[]) => {
    const m = new Map<string, { n: number; names: Record<string, number> }>();
    for (const s of list) { if (s.sensitive || !s.w.length) continue; const k = s.w.find((w) => chainVocab.has(w)) || s.w[0]; const e = m.get(k) || { n: 0, names: {} }; e.n++; e.names[s.raw] = (e.names[s.raw] || 0) + 1; m.set(k, e); }
    return m;
  };
  const disp = (e: { names: Record<string, number> }) => title(Object.entries(e.names).sort((a, b) => b[1] - a[1])[0][0]).slice(0, 36);
  const top = (m: ReturnType<typeof tally>, k = 10) => [...m.entries()].filter(([, e]) => e.n >= MIN_NAMED).sort((a, b) => b[1].n - a[1].n).slice(0, k);
  const drivers = top(tally(seenCur), 15).map(([w, e]) => {
    const ours = [...branches.values()].map((b) => b.prices.get(w)).filter((x): x is number => x != null);
    const comp = competitorVocab.get(w);
    const compPrices = comp ? [...comp.prices.values()] : [];
    return {
      name: disp(e), searches: e.n, branchesStocking: [...branches.values()].filter((b) => b.meds.has(w)).length,
      yourPrice: ours.length ? median(ours) : null, marketPrice: compPrices.length >= 3 ? median(compPrices) : null, competitors: comp ? comp.pharmacies.size : 0,
    };
  });
  const lostTop = top(tally(lost), 8).map(([, e]) => ({ name: disp(e), searches: e.n }));
  const unmetTop = top(tally(unmet), 8).map(([, e]) => ({ name: disp(e), searches: e.n }));

  /* ---- What people searched (all of ChekaMeds), against your shelf ---- */
  const curT = tally(cur); const prevT = tally(prev);
  const curShown = tally(seenCur);
  const searched = [...curT.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 20).map(([w, e]) => {
    const list = cur.filter((x) => !x.sensitive && (x.w.find((y) => chainVocab.has(y)) || x.w[0]) === w);
    return {
      name: disp(e), searches: e.n, change: pctChange(e.n, prevT.get(w)?.n || 0), showedYou: curShown.get(w)?.n || 0,
      youStock: chainVocab.has(w), foundNowhere: list.length ? Math.round((list.filter((x) => x.unfilled).length / list.length) * 100) : 0,
    };
  });
  const sensitiveCount = cur.filter((x) => x.sensitive).length;

  /* ---- Who is searching ---- */
  const chan = (list: S[]) => { const c: Record<string, number> = {}; for (const x of list) c[x.channel] = (c[x.channel] || 0) + 1; return Object.entries(c).sort((a, b) => b[1] - a[1]).map(([name, n]) => ({ name, n })); };
  const peopleAll = new Set(cur.map((x) => x.phone).filter(Boolean) as string[]);
  const ret = (set: Set<string>) => (set.size ? Math.round(([...set].filter((p) => phonesBefore.has(p)).length / set.size) * 100) : 0);
  const who = {
    channelsYou: chan(seenCur), channelsAll: chan(cur),
    returningYou: ret(people), returningAll: ret(peopleAll), peopleAll: peopleAll.size,
    perPerson: people.size ? Math.round((seenCur.length / people.size) * 10) / 10 : 0,
    afterHours: seenCur.length ? Math.round((seenCur.filter((x) => { const hh = new Date(x.t + TZ).getUTCHours(); return hh < 8 || hh >= 18; }).length / seenCur.length) * 100) : 0,
    weekend: seenCur.length ? Math.round((seenCur.filter((x) => [0, 6].includes(new Date(x.t + TZ).getUTCDay())).length / seenCur.length) * 100) : 0,
  };

  /* ---- Health outlook: what illness groups people searched for, and Pulse's status for each ---- */
  const gLabel = (g: string) => (g === 'srh' ? 'Sexual & reproductive health' : GROUPS.find((x) => x.id === g)?.label || 'Other medicines');
  const gc = (list: S[]) => { const c: Record<string, number> = {}; for (const x of list) c[x.group] = (c[x.group] || 0) + 1; return c; };
  const gNow = gc(cur); const gPrev = gc(prev); const gYou = gc(seenCur);
  const sig = new Map<string, any>((pulse?.live?.signals || []).map((x: any) => [x.group, x]));
  const outlook = Object.keys({ ...gNow, ...gPrev }).filter((g) => g !== 'other').map((g) => {
    const ps = sig.get(g); const grp = GROUPS.find((x) => x.id === g);
    return {
      group: gLabel(g), searches: gNow[g] || 0, change: pctChange(gNow[g] || 0, gPrev[g] || 0), showedYou: gYou[g] || 0,
      level: ps?.level || 'none', ratio: ps?.ratio != null ? Math.round(ps.ratio * 10) / 10 : null,
      note: ps?.level && ps.level !== 'none' ? (ps.reasons?.[0] || '') : '', action: ps?.level && ps.level !== 'none' ? grp?.action || '' : '',
      unnamed: g === 'srh',
    };
  }).sort((a, b) => ({ alert: 2, watch: 1, none: 0 } as any)[b.level] - ({ alert: 2, watch: 1, none: 0 } as any)[a.level] || b.searches - a.searches);

  /* ---- Stock health ---- */
  const stale = league.filter((b) => b.staleDays == null || b.staleDays > 14);
  const lastAny = Math.max(0, ...[...branches.values()].map((b) => b.last));

  /* ---- Health signals in the business's towns ---- */
  const myTowns = new Set([...branches.values()].map((b) => b.town).filter(Boolean));
  const signals = (pulse?.live?.alerts || []).filter((a: any) => (a.town === 'national' || a.town === 'botswana') || myTowns.has(a.town)).slice(0, 4)
    .map((a: any) => ({ label: a.label, level: a.level, place: a.townName, action: a.action }));

  /* ---- Recommendations, from the numbers above ---- */
  const recs: string[] = [];
  if (stale.length) recs.push(`Refresh stock at ${stale.length === league.length ? 'all' : stale.length} branch${stale.length === 1 ? '' : 'es'}: the latest update was ${lastAny ? `${Math.floor((Date.now() - lastAny) / DAY)} days ago` : 'never'}. Fresh stock ranks higher and turns more searches into visits.`);
  if (lostTop.length) recs.push(`${lost.length} search${lost.length === 1 ? ' was' : 'es were'} for medicines you carry but showed other pharmacies instead (top: ${lostTop.slice(0, 3).map((x) => x.name).join(', ')}). Check these are in stock and listed at the branches nearest the demand.`);
  if (unmetTop.length) recs.push(`Consider adding ${unmetTop.slice(0, 3).map((x) => x.name).join(', ')}: searched ${unmetTop.slice(0, 3).reduce((a, x) => a + x.searches, 0)} times and found at no pharmacy on ChekaMeds.`);
  const quiet = league.filter((b) => b.shown === 0);
  if (quiet.length && quiet.length < league.length) recs.push(`${quiet.length} branch${quiet.length === 1 ? '' : 'es'} did not appear in any results this month (${quiet.slice(0, 4).map((b) => b.branch).join(', ')}${quiet.length > 4 ? '…' : ''}). Few searches name those towns yet; local promotion of the ChekaMeds WhatsApp number would bring them in.`);
  const pricier = drivers.filter((d) => d.yourPrice != null && d.marketPrice != null && d.yourPrice > d.marketPrice * 1.1);
  if (pricier.length) recs.push(`Priced above the market on ${pricier.slice(0, 3).map((d) => d.name).join(', ')}, which are among the medicines that bring customers to you.`);

  const monthLabel = new Date(`${B.month}-01T00:00:00Z`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  return {
    business: business.trim(), month: B.month, monthLabel, partial: B.partial, daysCovered: days,
    prevMonthLabel: new Date(`${B.prev}-01T00:00:00Z`).toLocaleDateString('en-GB', { month: 'long', timeZone: 'UTC' }), generatedAt: new Date().toISOString(),
    headline: {
      branches: league.length, listings: league.reduce((a, b) => a + b.listings, 0), towns: myTowns.size,
      shown: seenCur.length, shownChange: pctChange(seenCur.length, seenPrev.length), people: people.size,
      shareOfVoice, nationalSearches: cur.length, trackedSearches: trackedCur.length, taps, reserves, orders,
      lost: lost.length, unmet: unmet.length, staleBranches: stale.length, lastUpdateDays: lastAny ? Math.floor((Date.now() - lastAny) / DAY) : null,
    },
    league, daily, heat, peakDay: dayT.some(Boolean) ? DAYS[dayT.indexOf(Math.max(...dayT))] : null, peakHour: hourT.some(Boolean) ? hourT.indexOf(Math.max(...hourT)) : null,
    origins: Object.entries(origins).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([t, n]) => ({ name: t === 'unknown' ? 'Town not given' : TOWNS.find((x) => x.id === t)?.name.replace('Greater ', '') || t, n })),
    drivers, lostTop, unmetTop, signals, recs, searched, sensitiveCount, who, outlook,
  };
}
export type BusinessReport = ReturnType<typeof computeBusiness>;
