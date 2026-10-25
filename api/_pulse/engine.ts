/* ChekaMeds Pulse – signal engine.
   Pure functions: cleaning, weekly aggregation, explainable multi-signal
   anomaly scoring, a calibrated district simulation and a back-test. */

import { GROUPS, OTHER_GROUP, TOWNS, groupFor, type Group, type Town } from './reference.js';

/* ---------- utilities ---------- */

export const DAY = 864e5;
const TZ_SHIFT = 2 * 3600e3; // Africa/Gaborone, UTC+2, no DST

/** Monday 00:00 (local) of the week containing t, as YYYY-MM-DD. */
export function weekKey(t: string | number | Date): string {
  const d = new Date(new Date(t).getTime() + TZ_SHIFT);
  const dow = (d.getUTCDay() + 6) % 7;
  const m = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - dow));
  return m.toISOString().slice(0, 10);
}

export function weekRange(endWeek: string, n: number): string[] {
  const end = new Date(endWeek + 'T00:00:00Z').getTime();
  return Array.from({ length: n }, (_, i) => new Date(end - (n - 1 - i) * 7 * DAY).toISOString().slice(0, 10));
}

/** Last fully completed week (the week before the current one). */
export function lastCompleteWeek(now = Date.now()): string {
  return weekKey(now - 7 * DAY);
}

export function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function poisson(lambda: number, r: () => number): number {
  if (lambda <= 0) return 0;
  if (lambda > 40) return Math.max(0, Math.round(lambda + Math.sqrt(lambda) * gauss(r)));
  const L = Math.exp(-lambda); let k = 0; let p = 1;
  do { k++; p *= r(); } while (p > L);
  return k - 1;
}
function gauss(r: () => number) { return Math.sqrt(-2 * Math.log(r() || 1e-9)) * Math.cos(2 * Math.PI * r()); }
function binom(n: number, p: number, r: () => number) { let k = 0; for (let i = 0; i < n; i++) if (r() < p) k++; return k; }

const mean = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const sd = (a: number[]) => { const m = mean(a); return Math.sqrt(mean(a.map((x) => (x - m) ** 2))); };
const round = (x: number, d = 1) => Math.round(x * 10 ** d) / 10 ** d;
export const SMALL_CELL = 5;

/* ---------- 1. cleaning ---------- */

const NOISE: RegExp[] = [
  /https?:|www\.|\.com\b|@/,
  /\+?\d[\d\s]{7,}/, // phone numbers
  /\bp\d{2,4}\b|\bp\s?\d{2,4}\s?each/, // prices (adverts)
  /brake|alternator|oil filter|hilux|toyota|land cruiser|ford ranger|vw polo|shock absorber|tyre|gearbox/,
  /ultramsg|whatsapp api|chatbot|testimon|follow this link|join my|ready for orders|available in store|combo/,
];
const NOISE_EXACT = /^(hi+|hello|hey|hie|dumela|good ?(day|morning|afternoon|evening|night)|morning|test(ing)?|help( now)?|thanks?|thank you|ok(ay)?|yes|no|\d+|this|google|pulse|menu|start|stop|search|medicine|medicines|pharmacy|hello everyone|[a-z])$/;
const TOWN_WORDS = new Set(TOWNS.flatMap((t) => [t.id, ...(t.aliases || [])]));

export type NoiseReason = 'advert_or_link' | 'greeting_or_test' | 'town_only' | 'too_long' | 'emoji' | null;

export function noiseReason(q: string): NoiseReason {
  const t = (q || '').toLowerCase().trim().replace(/\s+/g, ' ');
  if (!t) return 'greeting_or_test';
  if (t.length > 80) return 'too_long';
  if (NOISE.some((r) => r.test(t))) return 'advert_or_link';
  if (NOISE_EXACT.test(t)) return 'greeting_or_test';
  if (TOWN_WORDS.has(t)) return 'town_only';
  if ((t.match(/\p{Extended_Pictographic}/gu) || []).length >= 2) return 'emoji';
  return null;
}

const SENSITIVE = /(misoprostol|cytotec|morning after|ellaone|postinor|plan b|condom|priligy|dapoxetine|viagra|sildenafil|cialis|tadalafil|pregnan|abortion|tenofovir|dolutegravir|efavirenz|\barv|hiv|std|sti\b)/;
export const isSensitive = (q: string) => SENSITIVE.test((q || '').toLowerCase());

/* ---------- 2. weekly aggregation ---------- */

export type Cell = { c: number; u: number; m?: number }; // searches, unfilled, true multiplier (simulation only)
export type SeriesMap = Record<string, Record<string, Cell[]>>; // town -> group -> weeks

export function emptySeries(towns: string[], groups: string[], n: number): SeriesMap {
  const s: SeriesMap = {};
  for (const t of towns) { s[t] = {}; for (const g of groups) s[t][g] = Array.from({ length: n }, () => ({ c: 0, u: 0 })); }
  return s;
}

/* ---------- 3. detection ---------- */

export type Level = 'none' | 'watch' | 'alert';
export type Detection = {
  level: Level; kind: 'demand' | 'supply' | 'none'; score: number;
  count: number; expected: number; ratio: number; zDemand: number;
  unfilledShare: number; unfilledBase: number; zUnfilled: number;
  climate: number; climateNote: string | null; suppressed: boolean; rising: boolean;
};

export const THRESHOLDS = { watch: 2.0, alert: 3.0, baselineWeeks: 6, guardWeeks: 1 };

/** Explainable score for week t of one town×group series.
    demand  : Poisson-style z of searches vs the previous 6 weeks (1-week guard band)
    unfilled: rise in the share of searches nobody could fill (supply stress)
    climate : weather anomaly in the last 3 weeks, only for climate-sensitive groups,
              and only allowed to amplify a demand rise, never to create one. */
export function detect(series: Cell[], t: number, climateAnom: number[] | null, group: Group | null, opts: { multiSignal?: boolean } = {}): Detection {
  const multi = opts.multiSignal !== false;
  const lo = Math.max(0, t - THRESHOLDS.guardWeeks - THRESHOLDS.baselineWeeks);
  const hi = Math.max(0, t - THRESHOLDS.guardWeeks);
  const base = series.slice(lo, hi);
  const cur = series[t] || { c: 0, u: 0 };
  const m = mean(base.map((x) => x.c));
  const zDemand = (cur.c - m) / Math.sqrt(m + 1);
  const bc = base.reduce((a, x) => a + x.c, 0); const bu = base.reduce((a, x) => a + x.u, 0);
  const ub = bc ? bu / bc : 0.35;
  const uf = cur.c ? cur.u / cur.c : 0;
  const zUnfilled = cur.c ? ((uf - ub) * Math.sqrt(cur.c)) / Math.sqrt(ub * (1 - ub) + 0.05) : 0;

  let climate = 0; let climateNote: string | null = null;
  if (multi && group?.climate && climateAnom) {
    const w = climateAnom.slice(Math.max(0, t - 3), t + 1);
    const a = w.length ? Math.max(...w) : 0;
    if (a > 1 && zDemand > 1.5) {
      climate = 0.3 * Math.min(a, 2.5);
      climateNote = group.climate === 'rain' ? `rainfall well above normal in the last 3 weeks (${round(a)} SD)`
        : group.climate === 'heat' ? `temperatures well above normal in the last 3 weeks (${round(a)} SD)`
        : `colder than normal in the last 3 weeks (${round(a)} SD)`;
    }
  }
  const score = zDemand + (multi && zUnfilled > 1.5 ? 0.25 * zUnfilled : 0) + climate;
  const suppressed = cur.c < SMALL_CELL;
  const prev = series[t - 1]?.c ?? 0;
  let level: Level = suppressed ? 'none' : score >= THRESHOLDS.alert ? 'alert' : score >= THRESHOLDS.watch ? 'watch' : 'none';
  let kind: Detection['kind'] = level === 'none' ? 'none' : 'demand';
  // Supply stress: demand roughly normal but most searches cannot be filled.
  // Pooled over two weeks so small towns still have enough searches to judge.
  const p = series[t - 1] || { c: 0, u: 0 };
  const pc = cur.c + p.c; const pu = cur.u + p.u; const pf = pc ? pu / pc : 0;
  const zSupply = pc ? ((pf - ub) * Math.sqrt(pc)) / Math.sqrt(ub * (1 - ub) + 0.05) : 0;
  if (multi && !suppressed && level === 'none' && pc >= 8 && zSupply >= 2.5 && pf >= 0.65) { level = 'watch'; kind = 'supply'; }
  if (multi && kind === 'supply' && zSupply >= 3.5 && pf >= 0.75) level = 'alert';
  return {
    level, kind, score: round(score, 2), count: cur.c, expected: round(m), ratio: round(m > 0 ? cur.c / m : cur.c ? 9.9 : 1),
    zDemand: round(zDemand, 2), unfilledShare: round(uf, 2), unfilledBase: round(ub, 2), zUnfilled: round(zUnfilled, 2),
    climate: round(climate, 2), climateNote, suppressed, rising: cur.c > prev && prev > 0,
  };
}

export function explain(d: Detection, g: Group, place: string): string[] {
  const out = [`${g.label} searches in ${place}: ${d.count} this week vs about ${d.expected} expected (${d.ratio}×).`];
  if (d.zUnfilled > 1) out.push(`${Math.round(d.unfilledShare * 100)}% could not be filled vs ${Math.round(d.unfilledBase * 100)}% normally: people are looking and not finding it.`);
  if (d.climateNote) out.push(`Weather: ${d.climateNote}.`);
  if (d.rising) out.push('Up again on the previous week.');
  return out;
}

/* ---------- 4. weather ---------- */

export type Weather = { source: 'open-meteo' | 'climatology'; weeks: string[]; byTown: Record<string, { tmax: number[]; rain: number[] }> };

/** Seasonal normal for Botswana when the live weather API is unavailable. */
export function climatology(weeks: string[]): Weather {
  const byTown: Weather['byTown'] = {};
  for (const town of TOWNS) {
    const r = rng(town.pop);
    byTown[town.id] = { tmax: [], rain: [] };
    for (const w of weeks) {
      const doy = (new Date(w + 'T00:00:00Z').getTime() - Date.UTC(new Date(w).getUTCFullYear(), 0, 1)) / DAY;
      const season = Math.cos((2 * Math.PI * (doy - 15)) / 365);
      byTown[town.id].tmax.push(round(27 + 5.5 * season + (town.north ? 2 : 0) + gauss(r) * 1.4));
      byTown[town.id].rain.push(round(Math.max(0, (22 * season + 6) * (town.north ? 1.3 : 1) + gauss(r) * 8)));
    }
  }
  return { source: 'climatology', weeks, byTown };
}

export async function fetchWeather(weeks: string[]): Promise<Weather> {
  const start = weeks[0]; const endD = new Date(new Date(weeks.at(-1)! + 'T00:00:00Z').getTime() + 6 * DAY).toISOString().slice(0, 10);
  const lat = TOWNS.map((t) => t.lat).join(','); const lng = TOWNS.map((t) => t.lng).join(',');
  const urls = [
    `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lng}&start_date=${start}&end_date=${endD}&daily=temperature_2m_max,precipitation_sum&timezone=Africa%2FGaborone`,
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&past_days=92&forecast_days=1&daily=temperature_2m_max,precipitation_sum&timezone=Africa%2FGaborone`,
  ];
  const daily: Record<string, Record<string, { t: number[]; r: number[] }>> = {};
  let ok = false;
  for (const url of urls) {
    try {
      const ctl = new AbortController(); const timer = setTimeout(() => ctl.abort(), 6000);
      const res = await fetch(url, { signal: ctl.signal }); clearTimeout(timer);
      if (!res.ok) continue;
      const j = await res.json(); const arr = Array.isArray(j) ? j : [j];
      arr.forEach((loc: any, i: number) => {
        const town = TOWNS[i]; if (!town || !loc?.daily?.time) return;
        loc.daily.time.forEach((day: string, k: number) => {
          const wk = weekKey(day + 'T12:00:00+02:00');
          daily[town.id] ??= {}; daily[town.id][wk] ??= { t: [], r: [] };
          const tm = loc.daily.temperature_2m_max[k]; const pr = loc.daily.precipitation_sum[k];
          if (tm != null) daily[town.id][wk].t.push(tm);
          if (pr != null) daily[town.id][wk].r.push(pr);
        });
      });
      ok = true;
    } catch { /* try next */ }
  }
  if (!ok) return climatology(weeks);
  const clim = climatology(weeks);
  const byTown: Weather['byTown'] = {};
  for (const town of TOWNS) {
    byTown[town.id] = { tmax: [], rain: [] };
    weeks.forEach((w, i) => {
      const d = daily[town.id]?.[w];
      byTown[town.id].tmax.push(d?.t.length ? round(mean(d.t)) : clim.byTown[town.id].tmax[i]);
      byTown[town.id].rain.push(d?.r.length ? round(d.r.reduce((a, b) => a + b, 0)) : clim.byTown[town.id].rain[i]);
    });
  }
  return { source: 'open-meteo', weeks, byTown };
}

/** Weekly anomaly (SD units) per town for each climate driver. */
export function climateAnomalies(w: Weather): Record<string, Record<'rain' | 'heat' | 'cold', number[]>> {
  const out: Record<string, Record<'rain' | 'heat' | 'cold', number[]>> = {};
  /* Anomaly = this week vs the previous 8 weeks in the same town, so normal
     seasonal drift (winter to summer) is not mistaken for a heatwave or cold snap. */
  const trailing = (arr: number[], i: number, minSd: number) => {
    const prev = arr.slice(Math.max(0, i - 8), i);
    if (prev.length < 3) return 0;
    return (arr[i] - mean(prev)) / Math.max(sd(prev), minSd);
  };
  for (const [town, v] of Object.entries(w.byTown)) {
    const heat = v.tmax.map((_, i) => round(trailing(v.tmax, i, 1.5), 2));
    const rainZ = v.rain.map((_, i) => trailing(v.rain, i, 6));
    out[town] = {
      heat,
      cold: heat.map((x) => round(-x, 2)),
      rain: rainZ.map((_, i) => round(rainZ[i - 2] ?? 0, 2)), // malaria lags rain by ~2 weeks
    };
  }
  return out;
}

/* ---------- 5. district simulation ---------- */

export const SIM_GROUPS = [...GROUPS.map((g) => g.id), OTHER_GROUP];

const DEFAULT_MIX: Record<string, number> = {
  fever_pain: 0.2, respiratory: 0.13, allergy_asthma: 0.09, antibiotics: 0.1, chronic: 0.16,
  diarrhoea: 0.05, malaria: 0.015, skin_eye: 0.07, other: 0.185,
};

export type Story = { town: string; group: string; startOffset: number; ramp: number[]; unfilled?: number; title: string; truth: string };

/* Scenario events ending in the latest week, plus one historical wave. */
export const STORIES: Story[] = [
  { town: 'francistown', group: 'diarrhoea', startOffset: -2, ramp: [1.5, 2.2, 3.0], title: 'Diarrhoea cluster, Francistown', truth: 'Simulated water-contamination cluster starting 3 weeks ago.' },
  { town: 'maun', group: 'malaria', startOffset: -1, ramp: [2.0, 3.2], title: 'Malaria rise, Maun', truth: 'Simulated malaria rise after early rains, starting 2 weeks ago.' },
  { town: 'kanye', group: 'allergy_asthma', startOffset: -1, ramp: [1.6, 1.9], unfilled: 0.85, title: 'Inhaler stock-out, Kanye', truth: 'Simulated salbutamol shortage: normal demand, most searches unfilled.' },
  { town: 'gaborone', group: 'respiratory', startOffset: -17, ramp: [1.3, 1.7, 2.1, 1.8, 1.4], title: 'Winter flu wave, Greater Gaborone', truth: 'Simulated winter influenza wave in June–July.' },
  { town: 'serowe', group: 'skin_eye', startOffset: -9, ramp: [1.6, 2.4, 1.7], title: 'Conjunctivitis outbreak, Serowe', truth: 'Simulated school conjunctivitis outbreak in August.' },
];

export type SimOptions = { weeks: string[]; mix?: Record<string, number>; anomalies: ReturnType<typeof climateAnomalies>; seed?: number; stories?: Story[]; perTenK?: number; inject?: { town: string; group: string; start: number; ramp: number[] } };

export function simulate(o: SimOptions): SeriesMap {
  const n = o.weeks.length; const r = rng(o.seed ?? 20261120);
  const mix = { ...DEFAULT_MIX, ...(o.mix || {}) };
  const tot = Object.values(mix).reduce((a, b) => a + b, 0);
  const s = emptySeries(TOWNS.map((t) => t.id), SIM_GROUPS, n);
  const perTenK = o.perTenK ?? 7; // weekly searches per 10,000 people after national rollout
  for (const town of TOWNS) {
    const an = o.anomalies[town.id];
    for (const g of SIM_GROUPS) {
      const grp = GROUPS.find((x) => x.id === g);
      let share = mix[g] / tot;
      if (g === 'malaria') share *= town.north ? 6 : 0.5;
      const base = (town.pop / 1e4) * perTenK * share;
      for (let i = 0; i < n; i++) {
        let mult = 1;
        if (grp?.climate && an) mult *= 1 + 0.18 * Math.max(-1.5, Math.min(2.5, an[grp.climate][i] || 0));
        let ushare = 0.33 + (g === 'chronic' ? 0.1 : 0);
        for (const st of o.stories ?? []) {
          if (st.town !== town.id || st.group !== g) continue;
          const k = i - (n - 1 + st.startOffset);
          if (k >= 0 && k < st.ramp.length) { mult *= st.ramp[k]; if (st.unfilled) ushare = st.unfilled; }
        }
        if (o.inject && o.inject.town === town.id && o.inject.group === g) {
          const k = i - o.inject.start;
          if (k >= 0 && k < o.inject.ramp.length) mult *= o.inject.ramp[k];
        }
        const c = poisson(base * mult, r);
        s[town.id][g][i] = { c, u: binom(c, Math.min(0.95, ushare), r), m: mult };
      }
    }
  }
  return s;
}

/* ---------- 6. back-test ---------- */

export type BacktestResult = {
  trials: number; detected: number; sensitivity: number; medianLeadWeeks: number; meanLeadWeeks: number;
  falseAlertsPerTownMonth: number; alertsPerWeekNational: number; demandOnly: { sensitivity: number; medianLeadWeeks: number; falseAlertsPerTownMonth: number };
  method: string;
};

/** Inject synthetic outbreaks into the calibrated baseline and measure how early
    Pulse flags them versus routine reporting (assumed: noticed one week after the peak). */
export function backtest(weeks: string[], anomalies: ReturnType<typeof climateAnomalies>, mix: Record<string, number>, trials = 240): BacktestResult {
  const r = rng(777);
  const n = weeks.length; const minT = THRESHOLDS.baselineWeeks + THRESHOLDS.guardWeeks + 1;
  const gids = GROUPS.map((g) => g.id);
  const bigTowns = [...TOWNS].sort((a, b) => b.pop - a.pop).slice(0, 10); // enough volume to monitor
  const specs = Array.from({ length: trials }, (_, k) => {
    const town = bigTowns[Math.floor(r() * bigTowns.length)];
    const group = gids[Math.floor(r() * gids.length)];
    const start = minT + Math.floor(r() * (n - minT - 5));
    const A = 0.8 + r() * 1.4; // peak 1.8×–3.2× baseline
    const ramp = [1 + A * 0.25, 1 + A * 0.55, 1 + A * 0.85, 1 + A, 1 + A * 0.6];
    return { town, group, start, sim: simulate({ weeks, mix, anomalies, seed: 1000 + k, inject: { town: town.id, group, start, ramp } }) };
  });
  const baselines = Array.from({ length: 6 }, (_, k) => simulate({ weeks, mix, anomalies, seed: 5000 + k }));
  const runs = (multi: boolean) => {
    let det = 0; const leads: number[] = [];
    for (const { town, group, start, sim } of specs) {
      const g = GROUPS.find((x) => x.id === group)!;
      const routine = start + 3 + 1; // peak week + one week reporting lag
      for (let t = start; t <= start + 4 && t < n; t++) {
        const d = detect(sim[town.id][group], t, anomalies[town.id]?.[g.climate ?? 'heat'] ?? null, g, { multiSignal: multi });
        if (d.level === 'alert') { det++; leads.push(routine - t); break; }
      }
    }
    // false alerts: baseline-only simulations, every town×group×week
    let fa = 0; let cells = 0; let alerts = 0;
    for (const sim of baselines) {
      for (const town of bigTowns) for (const g of GROUPS) for (let t = minT; t < n; t++) {
        const d = detect(sim[town.id][g.id], t, anomalies[town.id]?.[g.climate ?? 'heat'] ?? null, g, { multiSignal: multi });
        cells++; if (d.level === 'alert') { alerts++; if ((sim[town.id][g.id][t].m ?? 1) < 1.25) fa++; }
      }
    }
    const weeksObs = 6 * (n - minT);
    const sorted = [...leads].sort((a, b) => a - b);
    return {
      sensitivity: round(det / trials, 2), detected: det,
      medianLeadWeeks: sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0,
      meanLeadWeeks: round(mean(leads), 1),
      falseAlertsPerTownMonth: round((fa / (10 * weeksObs)) * 4.345, 2),
      alertsPerWeekNational: round(alerts / weeksObs, 1),
      cells,
    };
  };
  const multi = runs(true); const demandOnly = runs(false);
  return {
    trials, detected: multi.detected, sensitivity: multi.sensitivity, medianLeadWeeks: multi.medianLeadWeeks, meanLeadWeeks: multi.meanLeadWeeks,
    falseAlertsPerTownMonth: multi.falseAlertsPerTownMonth, alertsPerWeekNational: multi.alertsPerWeekNational,
    demandOnly: { sensitivity: demandOnly.sensitivity, medianLeadWeeks: demandOnly.medianLeadWeeks, falseAlertsPerTownMonth: demandOnly.falseAlertsPerTownMonth },
    method: `${trials} synthetic outbreaks (peak 1.8–3.2× normal, 5-week curve) injected at random into the 10 largest towns and 8 signal groups, on top of a baseline driven by real weather. Routine reporting is assumed to notice an outbreak one week after its peak. An alert on an outbreak-free simulation counts as false when true demand that week was within 25% of normal (weather-driven rises of more than 25% are real increases, not false alarms).`,
  };
}

export { GROUPS, TOWNS, groupFor };
export type { Group, Town };
