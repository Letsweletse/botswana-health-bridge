import { createHmac } from 'node:crypto';
import { noiseReason, isSensitive, DAY } from './engine.js';
import { TOWNS, GROUPS, townFor, groupFor, stockTownFor, textTownFor } from './reference.js';
import { env, SITE } from './notify-lib.js';

/* ChekaMeds monthly market report for one partner pharmacy.
   Everything is aggregated: no phone numbers, names or individual searches leave
   this module. Phone numbers are used only inside it, to count unique and
   returning searchers. Named medicine lists only show counts of 3 or more, and
   sexual and reproductive health searches are counted but never named. */

const TZ = 2 * 3600e3;
const MIN_NAMED = 3;
export const NATIONAL = '__national__';
// Demo listings and pharmacies ChekaMeds no longer works with are left out of comparisons.
/** Chain key: the first two words of a pharmacy name ("pulse pharmacy"), used only when 2+ names share it. */
export const chainKeyOf = (name: string) => norm(name).replace(/[^a-z0-9 ]/g, '').split(' ').slice(0, 2).join(' ');
export const HIDE = /chekameds|demo|phase\s*-?\s*4|kganya/i;
const STOP = new Set(['tablet', 'tablets', 'tabs', 'syrup', 'cream', 'capsule', 'capsules', 'injection', 'drops', 'suspension', 'solution', 'medicine', 'medicines', 'pharmacy', 'where', 'need', 'have', 'with', 'from', 'available', 'price', 'please', 'want', 'looking', 'find', 'there', 'does', 'anyone']);
const TOWN_WORDS = new Set(TOWNS.flatMap((t) => [t.id, ...(t.aliases || [])]).flatMap((a) => a.split(/\s+/)));
export const norm = (s: string | null | undefined) => (s || '').toLowerCase().replace(/\s+/g, ' ').trim();
export const words = (s: string) => norm(s).split(/[^a-z0-9]+/).filter((w) => w.length >= 4 && !STOP.has(w) && !TOWN_WORDS.has(w) && !/^\d+$/.test(w));
export const title = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase()).replace(/\b(Ors|Arv|Bp|Hiv|Mg|Ml)\b/g, (m) => m.toUpperCase());
export const pctChange = (now: number, prev: number) => (prev >= 5 ? Math.round(((now - prev) / prev) * 100) : null);
export const median = (a: number[]) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

const secret = () => env('PULSE_LINK_SECRET') || `report:${env('SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SERVICE_KEY', 'SERVICE_ROLE_KEY') || ''}`;
export const reportSig = (clinic: string) => createHmac('sha256', secret()).update(`report.${norm(clinic)}`).digest('base64url').slice(0, 24);
export const reportUrl = (clinic: string, month?: string) => `${SITE}/report?p=${encodeURIComponent(clinic)}&s=${reportSig(clinic)}${month ? `&m=${month}` : ''}`;

export function monthBounds(m?: string) {
  const now = new Date(Date.now() + TZ);
  const cur = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  const month = m === 'current' || !m ? (m === 'current' ? cur : prevMonth(cur)) : /^\d{4}-\d{2}$/.test(m) ? m : prevMonth(cur);
  const start = Date.parse(`${month}-01T00:00:00+02:00`);
  const next = nextMonth(month);
  const endFull = Date.parse(`${next}-01T00:00:00+02:00`);
  const end = Math.min(endFull, Date.now());
  const prev = prevMonth(month);
  const prevStart = Date.parse(`${prev}-01T00:00:00+02:00`);
  return { month, start, end, endFull, partial: end < endFull, prev, prevStart, prevEnd: prevStart + (end - start), cur };
}
function prevMonth(m: string) { const [y, mo] = m.split('-').map(Number); const d = new Date(Date.UTC(y, mo - 2, 1)); return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`; }
function nextMonth(m: string) { const [y, mo] = m.split('-').map(Number); const d = new Date(Date.UTC(y, mo, 1)); return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`; }

async function fetchAll(sb: any, table: string, cols: string, filter?: (q: any) => any) {
  const out: any[] = [];
  for (let from = 0; from < 200000; from += 1000) {
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

type Search = { raw: string; w: string[]; shown: string[]; town: string | null; area: string | null; unfilled: boolean; t: number; phone: string | null; channel: string; sensitive: boolean; group: string };

export async function loadReportContext(sb: any, monthParam?: string) {
  const B = monthBounds(monthParam);
  const since = new Date(B.prevStart - 60 * DAY).toISOString(); // extra history to place searchers in a town
  const iso = (t: number) => new Date(t).toISOString();

  const [stock, logs, pulse, orderReq, delivery, cmOrders, impressions] = await Promise.all([
    fetchAll(sb, 'active_pharmacy_inventory', 'clinic_name,med_name,generic_name,brand_name,location,quantity,price_bwp,updated_at,last_verified_at'),
    fetchAll(sb, 'search_logs', 'normalized_query,query,results_count,found,source,location,user_lat,user_lng,user_phone,created_at,matched_pharmacies', (q) => q.gte('created_at', since).lt('created_at', iso(B.end)).order('created_at', { ascending: true })),
    safe(fetch(`${SITE}/api/pulse`).then((r) => r.json()), null as any),
    safe(fetchAll(sb, 'order_requests', 'pharmacy,created_at', (q) => q.gte('created_at', iso(B.start)).lt('created_at', iso(B.end))), [] as any[]),
    safe(fetchAll(sb, 'medicine_delivery_requests', 'pharmacy_name,created_at', (q) => q.gte('created_at', iso(B.start)).lt('created_at', iso(B.end))), [] as any[]),
    safe(fetchAll(sb, 'chekameds_orders', 'pharmacy_name,created_at', (q) => q.gte('created_at', iso(B.start)).lt('created_at', iso(B.end))), [] as any[]),
    safe(fetchAll(sb, 'search_impressions', 'pharmacy_name,selected,reserved,created_at', (q) => q.gte('created_at', iso(B.start)).lt('created_at', iso(B.end))), [] as any[]),
  ]);
  return { B, stock, logs, pulse, orderReq, delivery, cmOrders, impressions };
}
export type ReportContext = Awaited<ReturnType<typeof loadReportContext>>;

export async function buildReport(sb: any, clinicIn: string, monthParam?: string) {
  return computeReport(await loadReportContext(sb, monthParam), clinicIn);
}

export function computeReport(ctx: ReportContext, clinicIn: string) {
  const { B, stock, logs, pulse, orderReq, delivery, cmOrders, impressions } = ctx;

  /* ---- The pharmacy and its shelf (national mode: no pharmacy, all of Botswana) ---- */
  const isNational = clinicIn === NATIONAL;
  const key = isNational ? '' : norm(clinicIn);
  const mine = isNational ? [] : stock.filter((s: any) => norm(s.clinic_name) === key);
  const clinic = isNational ? 'Botswana' : mine[0]?.clinic_name?.trim() || clinicIn.trim();
  const townVotes: Record<string, number> = {};
  for (const it of mine) { const t = stockTownFor(it.clinic_name, it.location); if (t) townVotes[t] = (townVotes[t] || 0) + 1; }
  const town = Object.entries(townVotes).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  const townObj = TOWNS.find((t) => t.id === town) || null;

  const vocabOf = (items: any[]) => {
    const v = new Map<string, { inStock: boolean; prices: number[] }>();
    for (const it of items) for (const f of [it.med_name, it.generic_name, it.brand_name]) for (const w of words(f || '')) {
      const e = v.get(w) || { inStock: false, prices: [] };
      if ((it.quantity ?? 0) > 0) e.inStock = true;
      if (it.price_bwp && it.price_bwp > 0) e.prices.push(Number(it.price_bwp));
      v.set(w, e);
    }
    return v;
  };
  const myVocab = vocabOf(mine);
  // Other pharmacies in the same town (never named in the report).
  // Sister branches of the same chain are never treated as competitors.
  const chainCounts: Record<string, number> = {};
  for (const n of new Set(stock.map((x: any) => norm(x.clinic_name)))) { const c = chainKeyOf(n as string); chainCounts[c] = (chainCounts[c] || 0) + 1; }
  const myChain = key && chainCounts[chainKeyOf(key)] >= 2 ? chainKeyOf(key) : null;
  const others = new Map<string, any[]>();
  for (const s of stock) {
    const k = norm(s.clinic_name); if (!k || k === key || HIDE.test(k)) continue;
    if (myChain && chainKeyOf(k) === myChain) continue;
    if (town && stockTownFor(s.clinic_name, s.location) !== town) continue;
    (others.get(k) || others.set(k, []).get(k)!).push(s);
  }
  const otherVocabs = [...others.values()].map(vocabOf);

  let lastUpdate = 0; let inStock = 0;
  for (const it of mine) {
    if ((it.quantity ?? 0) > 0) inStock++;
    for (const d of [it.updated_at, it.last_verified_at]) { const ms = d ? Date.parse(d) : 0; if (ms > lastUpdate) lastUpdate = ms; }
  }

  /* ---- Searches ---- */
  const phoneTown: Record<string, string> = {};
  const areaOf = (loc: string | null) => {
    if (!townObj || !loc) return null;
    const l = norm(loc);
    return (townObj.aliases || []).find((a) => l.includes(a)) || null;
  };
  // A town from the search's location, GPS, or the words typed ("panado jwaneng", or a bare "Jwaneng" reply to the bot's town question).
  const placeOf = (r: any) => townFor(r.location, r.user_lat, r.user_lng) || textTownFor(r.query) || textTownFor(r.normalized_query);
  for (const r of logs) { const t = placeOf(r); if (t && r.user_phone) phoneTown[r.user_phone] = t; }
  const cur: Search[] = []; const prev: Search[] = [];
  const seen = new Set<string>();
  const phonesBefore = new Set<string>();
  for (const r of logs) {
    const t = Date.parse(r.created_at);
    const raw = norm(r.normalized_query || r.query);
    if (!raw || noiseReason(raw)) continue;
    if (t < B.start && r.user_phone) phonesBefore.add(r.user_phone);
    const bucket = t >= B.start && t < B.end ? cur : t >= B.prevStart && t < B.prevEnd ? prev : null;
    if (!bucket) continue;
    const day = Math.floor((t + TZ) / DAY);
    const dk = `${r.user_phone || r.created_at}|${raw}|${day}`; // same person, same medicine, same day counts once
    if (seen.has(dk)) continue; seen.add(dk);
    const sensitive = isSensitive(raw);
    bucket.push({
      raw, w: words(raw), shown: Array.isArray(r.matched_pharmacies) ? r.matched_pharmacies.map((x: any) => norm(String(x))) : [],
      town: placeOf(r) || (r.user_phone ? phoneTown[r.user_phone] : null) || null,
      area: areaOf(r.location), unfilled: !r.results_count || r.found === false, t, phone: r.user_phone || null,
      channel: String(r.source || 'web').startsWith('whatsapp') ? 'WhatsApp' : 'Web', // same rule as Pulse
      sensitive, group: sensitive ? 'srh' : groupFor(raw),
    });
  }
  const inScope = (s: Search) => (town ? s.town === town : true);
  const T = cur.filter(inScope); const Tp = prev.filter(inScope);
  const matches = (s: Search) => !s.sensitive && s.w.some((w) => myVocab.has(w));

  /* ---- Headline ---- */
  const yours = T.filter(matches); const yoursP = Tp.filter(matches);
  const yoursNat = cur.filter(matches);
  const phonesT = new Set(T.map((s) => s.phone).filter(Boolean) as string[]);
  const returning = [...phonesT].filter((p) => phonesBefore.has(p)).length;
  const unfilledT = T.filter((s) => s.unfilled);
  const located = cur.filter((s) => s.town).length;
  // Appearances: searches (anywhere in Botswana) whose results showed this pharmacy.
  const appeared = isNational ? 0 : cur.filter((s) => s.shown.includes(key)).length;
  const appearedP = isNational ? 0 : prev.filter((s) => s.shown.includes(key)).length;
  const appearedFrom: Record<string, number> = {};
  if (!isNational) for (const s of cur) if (s.shown.includes(key)) { const k2 = s.town || 'unknown'; appearedFrom[k2] = (appearedFrom[k2] || 0) + 1; }
  const imp = impressions.filter((i: any) => isNational || norm(i.pharmacy_name) === key);
  const taps = imp.filter((i: any) => i.selected).length; const reserves = imp.filter((i: any) => i.reserved).length;

  /* ---- Daily trend ---- */
  const days = Math.max(1, Math.ceil((B.end - B.start) / DAY));
  const daily = Array.from({ length: days }, (_, i) => ({ day: i + 1, searches: 0, yours: 0 }));
  for (const s of T) { const i = Math.floor((s.t - B.start) / DAY); if (daily[i]) { daily[i].searches++; if (matches(s)) daily[i].yours++; } }

  /* ---- When people search (local time) ---- */
  const heat = Array.from({ length: 7 }, () => Array(24).fill(0));
  for (const s of T) { const d = new Date(s.t + TZ); heat[(d.getUTCDay() + 6) % 7][d.getUTCHours()]++; }
  const dayTotals = heat.map((r) => r.reduce((a, b) => a + b, 0));
  const hourTotals = Array.from({ length: 24 }, (_, h) => heat.reduce((a, r) => a + r[h], 0));
  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const peakDay = dayTotals.some((x) => x) ? DAYS[dayTotals.indexOf(Math.max(...dayTotals))] : null;
  const peakHour = hourTotals.some((x) => x) ? hourTotals.indexOf(Math.max(...hourTotals)) : null;
  const afterHours = T.filter((s) => { const h = new Date(s.t + TZ).getUTCHours(); return h < 8 || h >= 18; }).length;

  /* ---- Who / how ---- */
  const channels: Record<string, number> = {};
  for (const s of T) channels[s.channel] = (channels[s.channel] || 0) + 1;
  const areas: Record<string, number> = {};
  for (const s of T) if (s.area) areas[s.area] = (areas[s.area] || 0) + 1;
  const townsNat: Record<string, number> = {};
  for (const s of cur) if (s.town) townsNat[s.town] = (townsNat[s.town] || 0) + 1;

  /* ---- Categories ---- */
  const groupLabel = (g: string) => (g === 'srh' ? 'Sexual & reproductive health' : GROUPS.find((x) => x.id === g)?.label || 'Other medicines');
  const cats: Record<string, { n: number; p: number }> = {};
  for (const s of T) (cats[s.group] ||= { n: 0, p: 0 }).n++;
  for (const s of Tp) (cats[s.group] ||= { n: 0, p: 0 }).p++;

  /* ---- Medicines: demand vs your shelf vs the town ---- */
  const tally = (list: Search[]) => {
    const m = new Map<string, { n: number; unfilled: number; names: Record<string, number> }>();
    for (const s of list) {
      if (s.sensitive || !s.w.length) continue;
      const k = s.w[0];
      const e = m.get(k) || { n: 0, unfilled: 0, names: {} };
      e.n++; if (s.unfilled) e.unfilled++; e.names[s.raw] = (e.names[s.raw] || 0) + 1; m.set(k, e);
    }
    return m;
  };
  const curM = tally(T); const prevM = tally(Tp);
  const display = (e: { names: Record<string, number> }) => title(Object.entries(e.names).sort((a, b) => b[1] - a[1])[0][0]).slice(0, 36);
  const medicines = [...curM.entries()].filter(([, e]) => e.n >= MIN_NAMED).sort((a, b) => b[1].n - a[1].n).slice(0, 20).map(([w, e], i) => {
    const mineE = myVocab.get(w);
    const townStocking = otherVocabs.filter((v) => v.get(w)?.inStock).length;
    const otherPrices = otherVocabs.map((v) => v.get(w)?.prices || []).filter((p) => p.length).map((p) => Math.min(...p));
    const myPrice = mineE?.prices.length ? Math.min(...mineE.prices) : null;
    const townMedian = otherPrices.length >= 3 ? median(otherPrices) : null;
    return {
      rank: i + 1, name: display(e), searches: e.n, change: pctChange(e.n, prevM.get(w)?.n || 0), unfilledShare: Math.round((e.unfilled / e.n) * 100),
      youList: !!mineE, youInStock: !!mineE?.inStock, pharmaciesInTown: townStocking + (mineE?.inStock ? 1 : 0),
      yourPrice: myPrice, townMedian: townMedian != null ? Math.round(townMedian * 100) / 100 : null,
    };
  });
  const rising = [...curM.entries()].map(([w, e]) => ({ name: display(e), n: e.n, p: prevM.get(w)?.n || 0 }))
    .filter((x) => x.n >= 5 && x.n >= x.p * 1.5 && x.n - x.p >= 3).sort((a, b) => (b.n - b.p) - (a.n - a.p)).slice(0, 6);
  const missed = [...curM.entries()].filter(([w, e]) => e.unfilled >= MIN_NAMED && !myVocab.has(w)).sort((a, b) => b[1].unfilled - a[1].unfilled).slice(0, 10)
    .map(([, e]) => ({ name: display(e), searches: e.n, notFound: e.unfilled }));
  const restock = [...curM.entries()].filter(([w, e]) => e.n >= MIN_NAMED && myVocab.has(w) && !myVocab.get(w)!.inStock).sort((a, b) => b[1].n - a[1].n).slice(0, 8)
    .map(([, e]) => ({ name: display(e), searches: e.n }));

  /* ---- Health signals from Pulse ---- */
  const signals: { label: string; level: string; place: string; action: string }[] = [];
  for (const a of pulse?.live?.alerts || []) {
    if (isNational || a.town === town || (a.town === 'national' || a.town === 'botswana')) signals.push({ label: a.label, level: a.level, place: a.townName, action: a.action });
  }

  const orders = [orderReq, delivery, cmOrders].reduce((n, list: any[]) => n + list.filter((o: any) => isNational || norm(o.pharmacy || o.pharmacy_name) === key).length, 0);
  /* ---- National network view (consolidated bulletin only) ---- */
  let network: any = null;
  if (isNational) {
    const ph = new Map<string, { town: string | null; listings: number; inStock: number; last: number }>();
    for (const it of stock) {
      const k = norm(it.clinic_name); if (!k || HIDE.test(k)) continue;
      const e = ph.get(k) || { town: stockTownFor(it.clinic_name, it.location), listings: 0, inStock: 0, last: 0 };
      e.listings++; if ((it.quantity ?? 0) > 0) e.inStock++;
      for (const d of [it.updated_at, it.last_verified_at]) { const ms = d ? Date.parse(d) : 0; if (ms > e.last) e.last = ms; }
      ph.set(k, e);
    }
    const all = [...ph.values()];
    const fresh = (e: { last: number }) => e.last && Date.now() - e.last <= 14 * DAY;
    const phTown = new Map([...ph.entries()].map(([k2, e]) => [k2, e.town]));
    const shownIn = (x: Search, tid: string) => x.shown.some((k2) => phTown.get(k2) === tid);
    const townsTable = TOWNS.map((t) => {
      const c = cur.filter((x) => x.town === t.id); const pv = prev.filter((x) => x.town === t.id);
      const shownHere = cur.filter((x) => shownIn(x, t.id)).length; const shownHereP = prev.filter((x) => shownIn(x, t.id)).length;
      const pts = all.filter((e) => e.town === t.id);
      const L = pts.reduce((a, e) => a + e.listings, 0); const I = pts.reduce((a, e) => a + e.inStock, 0);
      return {
        name: t.name.replace('Greater ', ''), searches: c.length, change: pctChange(c.length, pv.length), shownHere, shownChange: pctChange(shownHere, shownHereP),
        notFoundShare: c.length ? Math.round((c.filter((x) => x.unfilled).length / c.length) * 100) : 0,
        pharmacies: pts.length, listings: L, inStockShare: L ? Math.round((I / L) * 100) : 0,
        freshShare: pts.length ? Math.round((pts.filter(fresh).length / pts.length) * 100) : 0,
        perPharmacy: pts.length ? Math.round(c.length / pts.length) : null,
      };
    }).sort((a, b) => (b.searches + b.shownHere) - (a.searches + a.shownHere));
    const L = all.reduce((a, e) => a + e.listings, 0); const I = all.reduce((a, e) => a + e.inStock, 0);
    const natPhones = new Set(cur.map((x) => x.phone).filter(Boolean) as string[]);
    const natReturning = [...natPhones].filter((p) => phonesBefore.has(p)).length;
    network = {
      pharmacies: all.length, listings: L, inStockShare: L ? Math.round((I / L) * 100) : 0,
      freshShare: all.length ? Math.round((all.filter(fresh).length / all.length) * 100) : 0,
      towns: townsTable, uniqueSearchers: natPhones.size, returningShare: natPhones.size ? Math.round((natReturning / natPhones.size) * 100) : 0,
      underserved: townsTable.filter((t) => t.searches >= 20 && (t.pharmacies <= 1 || t.notFoundShare >= 35)).slice(0, 5).map((t) => t.name),
    };
  }

  const monthLabel = new Date(`${B.month}-01T00:00:00Z`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });

  return {
    clinic, month: B.month, monthLabel, partial: B.partial, daysCovered: days, prevMonthLabel: new Date(`${B.prev}-01T00:00:00Z`).toLocaleDateString('en-GB', { month: 'long', timeZone: 'UTC' }),
    town, townName: townObj ? townObj.name.replace('Greater ', '') : null, generatedAt: new Date().toISOString(),
    headline: {
      townSearches: T.length, townSearchesChange: pctChange(T.length, Tp.length),
      yourSearches: yours.length, yourSearchesChange: pctChange(yours.length, yoursP.length), yourSearchesNational: yoursNat.length,
      coverage: T.length ? Math.round((yours.length / T.filter((s) => !s.sensitive).length) * 100) : 0,
      uniqueSearchers: phonesT.size, returningShare: phonesT.size ? Math.round((returning / phonesT.size) * 100) : 0,
      notFound: unfilledT.length, notFoundShare: T.length ? Math.round((unfilledT.length / T.length) * 100) : 0,
      orders, nationalSearches: cur.length, locatedShare: cur.length ? Math.round((located / cur.length) * 100) : 0,
      appeared, appearedChange: pctChange(appeared, appearedP), taps, reserves,
    },
    shelf: { listings: mine.length, inStock, inStockShare: mine.length ? Math.round((inStock / mine.length) * 100) : 0, lastUpdate: lastUpdate ? new Date(lastUpdate).toISOString() : null, staleDays: lastUpdate ? Math.floor((Date.now() - lastUpdate) / DAY) : null, pharmaciesInTown: others.size + 1 },
    daily, heat, peakDay, peakHour, afterHoursShare: T.length ? Math.round((afterHours / T.length) * 100) : 0,
    channels: Object.entries(channels).sort((a, b) => b[1] - a[1]).map(([name, n]) => ({ name, n })),
    areas: Object.entries(areas).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([a, n]) => ({ name: title(a), n })),
    towns: Object.entries(townsNat).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([t, n]) => ({ name: TOWNS.find((x) => x.id === t)?.name.replace('Greater ', '') || t, n, you: t === town })),
    categories: Object.entries(cats).filter(([, v]) => v.n > 0).sort((a, b) => b[1].n - a[1].n).slice(0, 8).map(([g, v]) => ({ name: groupLabel(g), n: v.n, change: pctChange(v.n, v.p), unnamed: g === 'srh' })),
    medicines, rising, missed, restock, signals: signals.slice(0, 4), national: isNational, network,
    appearedFrom: Object.entries(appearedFrom).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([t, n]) => ({ name: t === 'unknown' ? 'Town not given' : TOWNS.find((x) => x.id === t)?.name.replace('Greater ', '') || t, n, you: t === town })),
  };
}
export type Report = ReturnType<typeof computeReport>;
