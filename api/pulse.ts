import { createClient } from '@supabase/supabase-js';

/* ChekaMeds Pulse – data probe (temporary). Returns aggregate counts only. */

declare const process: { env: Record<string, string | undefined> };
type ApiResponse = { status: (code: number) => ApiResponse; json: (body: unknown) => void; setHeader: (n: string, v: string) => void };
type ApiRequest = { method?: string; query?: Record<string, string | string[]> };

const env = (...names: string[]) => names.map((n) => process.env[n]?.trim()).find(Boolean);

async function fetchAll(sb: any, table: string, cols: string, since: string) {
  const out: any[] = [];
  for (let from = 0; from < 200000; from += 1000) {
    const { data, error } = await sb.from(table).select(cols).gte('created_at', since).order('created_at', { ascending: true }).range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    out.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

const bump = (m: Record<string, number>, k: string) => { m[k] = (m[k] || 0) + 1; };
const top = (m: Record<string, number>, n: number, min = 3) => Object.entries(m).filter(([, v]) => v >= min).sort((a, b) => b[1] - a[1]).slice(0, n);

export default async function handler(req: ApiRequest, res: ApiResponse) {
  const url = env('SUPABASE_URL', 'VITE_SUPABASE_URL');
  const key = env('SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SERVICE_KEY', 'SERVICE_ROLE_KEY');
  if (!url || !key) return res.status(500).json({ error: 'not configured' });
  const sb = createClient(url, key, { auth: { persistSession: false } });
  try {
    const since = new Date(Date.now() - 400 * 864e5).toISOString();
    const [logs, failed] = await Promise.all([
      fetchAll(sb, 'search_logs', 'normalized_query,results_count,found,source,location,user_lat,created_at', since),
      fetchAll(sb, 'failed_searches', 'query,source,location,created_at', since),
    ]);
    const month: Record<string, number> = {}, fmonth: Record<string, number> = {}, loc: Record<string, number> = {}, floc: Record<string, number> = {}, src: Record<string, number> = {}, q: Record<string, number> = {}, fq: Record<string, number> = {};
    let withLatLng = 0, zero = 0;
    for (const r of logs) {
      bump(month, String(r.created_at).slice(0, 7)); bump(src, r.source || '?');
      bump(loc, String(r.location || '∅').toLowerCase().slice(0, 40)); bump(q, String(r.normalized_query || '').toLowerCase());
      if (r.user_lat != null) withLatLng++; if (!r.results_count) zero++;
    }
    for (const r of failed) { bump(fmonth, String(r.created_at).slice(0, 7)); bump(floc, String(r.location || '∅').toLowerCase().slice(0, 40)); bump(fq, String(r.query || '').toLowerCase()); }
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({
      search_logs: { n: logs.length, first: logs[0]?.created_at, last: logs.at(-1)?.created_at, zero_results: zero, with_latlng: withLatLng, by_month: month, by_source: src, top_locations: top(loc, 40, 2), top_queries: top(q, 60) },
      failed_searches: { n: failed.length, first: failed[0]?.created_at, last: failed.at(-1)?.created_at, by_month: fmonth, top_locations: top(floc, 25, 2), top_queries: top(fq, 60) },
    });
  } catch (e) {
    return res.status(500).json({ error: String((e as Error).message || e) });
  }
}
