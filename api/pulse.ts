import { createClient } from '@supabase/supabase-js';
import {
  GROUPS, TOWNS, groupFor, weekKey, weekRange, lastCompleteWeek, noiseReason, isSensitive,
  detect, explain, fetchWeather, climateAnomalies, simulate, backtest, STORIES, SIM_GROUPS,
  SMALL_CELL, THRESHOLDS, type Cell,
} from './_pulse/engine.js';
import { OTHER_GROUP, townFor } from './_pulse/reference.js';

/* ChekaMeds Pulse API.
   Reads raw searches and stock with the service role, and returns ONLY aggregated,
   small-cell-suppressed numbers: no phone numbers, no individual searches. */

declare const process: { env: Record<string, string | undefined> };
type ApiResponse = { status: (code: number) => ApiResponse; json: (body: unknown) => void; setHeader: (n: string, v: string) => void };
type ApiRequest = { method?: string; query?: Record<string, string | string[]> };

const env = (...names: string[]) => names.map((n) => process.env[n]?.trim()).find(Boolean);
const WEEKS = 26;
export const maxDuration = 60;

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

const supp = (n: number) => (n > 0 && n < SMALL_CELL ? null : n); // null = "<5"

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method && req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const url = env('SUPABASE_URL', 'VITE_SUPABASE_URL');
  const key = env('SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SERVICE_KEY', 'SERVICE_ROLE_KEY');
  if (!url || !key) return res.status(500).json({ error: 'Pulse is not configured' });
  const sb = createClient(url, key, { auth: { persistSession: false } });

  const endWeek = lastCompleteWeek();
  const weeks = weekRange(endWeek, WEEKS);
  const since = new Date(weeks[0] + 'T00:00:00+02:00').toISOString();

  try {
    const [logs, stock, weather] = await Promise.all([
      fetchAll(sb, 'search_logs', 'normalized_query,query,results_count,found,source,location,user_lat,user_lng,user_phone,created_at', (q) => q.gte('created_at', since).order('created_at', { ascending: true })),
      fetchAll(sb, 'active_pharmacy_inventory', 'med_name,generic_name,clinic_name,location,quantity'),
      fetchWeather(weeks),
    ]);
    const anomalies = climateAnomalies(weather);
    const idx = new Map(weeks.map((w, i) => [w, i]));
    const currentWeek = weekKey(Date.now());

    /* ---------------- LIVE: real searches ---------------- */
    const gids = [...GROUPS.map((g) => g.id), OTHER_GROUP];
    const national: Record<string, Cell[]> = Object.fromEntries(gids.map((g) => [g, weeks.map(() => ({ c: 0, u: 0 }))]));
    const weekly = weeks.map((w) => ({ week: w, searches: 0, unfilled: 0, noise: 0 }));
    const noise: Record<string, number> = {};
    const unmet: Record<string, number> = {}; const unmetGroup: Record<string, string> = {};
    const located: Record<string, number> = {};
    let cleanTotal = 0; let locatedTotal = 0; let sensitiveUnmet = 0;
    let thisWeek = 0; let thisWeekUnfilled = 0;
    const channel: Record<string, number> = {};

    const seen = new Set<string>(); let duplicates = 0;
    for (const r of logs) {
      const q = String(r.normalized_query || r.query || '').toLowerCase().trim();
      const wk = weekKey(r.created_at);
      // One person repeating the same search in a week counts once.
      if (r.user_phone) { const k = `${r.user_phone}|${q}|${wk}`; if (seen.has(k)) { duplicates++; continue; } seen.add(k); }
      const i = idx.get(wk);
      const reason = noiseReason(q);
      if (reason) { noise[reason] = (noise[reason] || 0) + 1; if (i != null) weekly[i].noise++; continue; }
      const unfilled = !r.results_count || r.found === false;
      if (wk === currentWeek) { thisWeek++; if (unfilled) thisWeekUnfilled++; }
      if (i == null) continue;
      cleanTotal++;
      const src = String(r.source || 'web').startsWith('whatsapp') ? 'WhatsApp' : 'Web';
      channel[src] = (channel[src] || 0) + 1;
      const g = groupFor(q);
      national[g][i].c++; if (unfilled) national[g][i].u++;
      weekly[i].searches++; if (unfilled) weekly[i].unfilled++;
      const town = townFor(r.location, r.user_lat, r.user_lng);
      if (town) { located[town] = (located[town] || 0) + 1; locatedTotal++; }
      if (unfilled && i >= WEEKS - 13) {
        if (isSensitive(q)) sensitiveUnmet++;
        else if (q.length >= 3 && q.length <= 40) { unmet[q] = (unmet[q] || 0) + 1; unmetGroup[q] = g; }
      }
    }

    const t = WEEKS - 1;
    const liveSignals = GROUPS.map((g) => {
      const d = detect(national[g.id], t, null, g);
      const last4 = national[g.id].slice(-4).reduce((a, x) => a + x.c, 0);
      return {
        group: g.id, label: g.label, level: d.level, kind: d.kind, score: d.score,
        count: supp(d.count), expected: d.expected, ratio: d.ratio, unfilledShare: d.unfilledShare,
        last4: supp(last4), spark: national[g.id].slice(-12).map((x) => x.c),
        reasons: d.level !== 'none' ? explain(d, g, 'Botswana') : [],
      };
    }).sort((a, b) => (b.last4 ?? 0) - (a.last4 ?? 0));

    const topUnmet = Object.entries(unmet).filter(([, n]) => n >= 3).sort((a, b) => b[1] - a[1]).slice(0, 12)
      .map(([name, n]) => ({ name, searches: n, group: unmetGroup[name] }));

    /* real stock by town × group */
    const stockTown: Record<string, { listings: number; inStock: number; pharmacies: Set<string>; groups: Record<string, number> }> = {};
    for (const s of stock) {
      const town = townFor(s.location); if (!town) continue;
      const st = (stockTown[town] ??= { listings: 0, inStock: 0, pharmacies: new Set(), groups: {} });
      st.listings++; st.pharmacies.add(s.clinic_name);
      if ((s.quantity ?? 0) > 0) {
        st.inStock++;
        const g = groupFor(`${s.med_name} ${s.generic_name || ''}`);
        if (g !== OTHER_GROUP) st.groups[g] = (st.groups[g] || 0) + 1;
      }
    }
    const stockByTown = Object.entries(stockTown).map(([town, v]) => ({
      town, listings: v.listings, inStock: v.inStock, pharmacies: v.pharmacies.size,
      groups: v.groups, gaps: GROUPS.filter((g) => (v.groups[g.id] || 0) < 3).map((g) => g.id),
    })).sort((a, b) => b.listings - a.listings);

    const live = {
      weeks, weekly,
      totals: {
        clean: cleanTotal, duplicates, noise: Object.values(noise).reduce((a, b) => a + b, 0), noiseByReason: noise,
        unfilled: weekly.reduce((a, w) => a + w.unfilled, 0), located: locatedTotal,
        locatedShare: cleanTotal ? Math.round((locatedTotal / cleanTotal) * 100) / 100 : 0,
        channel, thisWeek: { searches: thisWeek, unfilled: thisWeekUnfilled, week: currentWeek },
        pharmacies: new Set(stock.map((s) => s.clinic_name)).size, stockListings: stock.length,
      },
      signals: liveSignals,
      topUnmet, sensitiveUnmet: supp(sensitiveUnmet),
      locatedByTown: Object.entries(located).map(([town, n]) => ({ town, searches: supp(n) })).sort((a, b) => (b.searches ?? 0) - (a.searches ?? 0)),
      stockByTown,
    };

    /* ---------------- SIMULATION: district roll-out ---------------- */
    // Calibrate the illness mix on real searches (blended 50/50 with a default mix).
    // Real shares are taken among recognised illness groups only, so unrecognised
    // searches ("other") do not dilute the signals; "other" keeps its default share.
    const DEFAULT: Record<string, number> = { fever_pain: 0.2, respiratory: 0.13, allergy_asthma: 0.09, antibiotics: 0.1, chronic: 0.16, diarrhoea: 0.05, malaria: 0.015, skin_eye: 0.07, other: 0.185 };
    const illness = GROUPS.map((g) => g.id);
    const realTotal = illness.reduce((a, g) => a + national[g].reduce((s, x) => s + x.c, 0), 0) || 1;
    const defTotal = illness.reduce((a, g) => a + DEFAULT[g], 0);
    const mix: Record<string, number> = { other: DEFAULT.other };
    for (const g of illness) mix[g] = defTotal * (0.5 * (DEFAULT[g] / defTotal) + 0.5 * (national[g].reduce((s, x) => s + x.c, 0) / realTotal));

    const sim = simulate({ weeks, mix, anomalies, stories: STORIES });
    const minT = THRESHOLDS.baselineWeeks + THRESHOLDS.guardWeeks + 1;
    const alerts: any[] = []; const history: any[] = [];
    const townStatus: Record<string, { level: string; score: number; group: string | null }> = {};
    for (const town of TOWNS) {
      townStatus[town.id] = { level: 'none', score: 0, group: null };
      for (const g of GROUPS) {
        const an = g.climate ? anomalies[town.id][g.climate] : null;
        for (let k = minT; k < WEEKS; k++) {
          const d = detect(sim[town.id][g.id], k, an, g);
          if (d.level === 'none') continue;
          const item = {
            week: weeks[k], town: town.id, townName: town.name, group: g.id, label: g.label,
            level: d.level, kind: d.kind, score: d.score, count: d.count, expected: d.expected, ratio: d.ratio,
            unfilledShare: d.unfilledShare, unfilledBase: d.unfilledBase,
            contributions: { demand: d.zDemand, unfilled: d.zUnfilled, climate: d.climate },
            reasons: explain(d, g, town.name),
            signal: d.kind === 'supply' ? 'Supply problem: people are searching and not finding this medicine' : g.signal,
            action: d.kind === 'supply' ? 'Ask pharmacies and suppliers in the area to restock; check Central Medical Stores supply for this medicine group.' : g.action,
            owner: d.kind === 'supply' ? 'Pharmacies, suppliers and CMS' : g.owner,
            series: sim[town.id][g.id].map((x) => x.c), unfilledSeries: sim[town.id][g.id].map((x) => x.u),
            climateSeries: an,
          };
          if (d.level === 'alert') history.push({ week: weeks[k], town: town.id, townName: town.name, group: g.id, label: g.label, kind: d.kind, score: d.score });
          if (k === WEEKS - 1) {
            alerts.push(item);
            const rank = (l: string) => (l === 'alert' ? 2 : l === 'watch' ? 1 : 0);
            const cur = townStatus[town.id];
            if (rank(d.level) > rank(cur.level) || (rank(d.level) === rank(cur.level) && d.score > cur.score)) townStatus[town.id] = { level: d.level, score: d.score, group: g.id };
          }
        }
      }
    }
    alerts.sort((a, b) => (a.level === b.level ? b.score - a.score : a.level === 'alert' ? -1 : 1));

    // Did Pulse catch the scripted scenarios, and when?
    const validation = STORIES.map((s) => {
      const start = WEEKS - 1 + s.startOffset; const peak = start + s.ramp.indexOf(Math.max(...s.ramp));
      const first = history.filter((h) => h.town === s.town && h.group === s.group && idx.get(h.week)! >= start)
        .map((h) => idx.get(h.week)!).sort((a, b) => a - b)[0];
      const watchFirst = (() => {
        const g = GROUPS.find((x) => x.id === s.group)!;
        for (let k = start; k < WEEKS; k++) { const d = detect(sim[s.town][s.group], k, g.climate ? anomalies[s.town][g.climate] : null, g); if (d.level !== 'none') return k; }
        return undefined;
      })();
      const flagged = first ?? watchFirst;
      return {
        title: s.title, truth: s.truth, town: s.town, group: s.group, startWeek: weeks[start], peakWeek: weeks[Math.min(peak, WEEKS - 1)],
        flaggedWeek: flagged != null ? weeks[flagged] : null, level: first != null ? 'alert' : watchFirst != null ? 'watch' : 'missed',
        weeksAfterStart: flagged != null ? flagged - start : null, ongoing: peak >= WEEKS - 1,
      };
    });

    const bt = backtest(weeks, anomalies, mix, 240);

    const body = {
      generated_at: new Date().toISOString(),
      week: endWeek,
      weather: { source: weather.source, byTown: weather.byTown, anomalies },
      groups: GROUPS.map(({ match, ...g }) => g),
      towns: TOWNS.map(({ aliases, ...t }) => t),
      thresholds: { ...THRESHOLDS, smallCell: SMALL_CELL },
      live,
      sim: {
        weeks, alerts, history, townStatus, validation, backtest: bt, mix,
        assumptions: [
          'National roll-out volume: 7 searches per 10,000 people per week, split across illness groups by the real ChekaMeds search mix (blended 50/50 with a default mix).',
          'Seasonal and weather effects use real Open-Meteo data for each town when available, otherwise Botswana seasonal normals.',
          'Malaria demand is 4× higher in Ngamiland and Chobe than in the south.',
          'Scenario events (listed under Validation) are scripted so the detector can be checked against a known truth.',
        ],
      },
    };
    res.setHeader('Cache-Control', 'public, s-maxage=21600, stale-while-revalidate=86400');
    return res.status(200).json(body);
  } catch (e) {
    return res.status(500).json({ error: String((e as Error).message || e) });
  }
}
