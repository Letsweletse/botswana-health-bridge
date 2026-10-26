import { serviceClient } from './_pulse/notify-lib.js';
import { buildReport, reportSig } from './_pulse/report-lib.js';

/* Monthly market report for one partner pharmacy.
   Access:  ?p=<pharmacy>&s=<signed>   link sent to the pharmacy each month
            Bearer <session>           the pharmacy's own login (its own report only), or a ChekaMeds admin (any ?p=)
   ?m=YYYY-MM | current (month to date). Default: last complete month. */

type ApiResponse = { status: (code: number) => ApiResponse; json: (body: unknown) => void; setHeader: (n: string, v: string) => void };
type ApiRequest = { method?: string; headers: Record<string, string | string[] | undefined>; query?: Record<string, string | string[]> };
export const maxDuration = 60;

async function clinicForUser(sb: any, userId: string): Promise<{ clinic: string | null; admin: boolean }> {
  const [role, ph, access, prof] = await Promise.all([
    sb.from('user_roles').select('role').eq('user_id', userId).eq('role', 'admin').maybeSingle(),
    sb.from('pharmacies').select('clinic_name').eq('user_id', userId).limit(1).maybeSingle(),
    sb.from('pharmacy_user_access').select('pharmacy_name').eq('user_id', userId).limit(1).maybeSingle(),
    sb.from('profiles').select('clinic_name,role').eq('id', userId).maybeSingle(),
  ]);
  return { admin: !!role.data || prof.data?.role === 'admin', clinic: ph.data?.clinic_name || access.data?.pharmacy_name || prof.data?.clinic_name || null };
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  const sb = serviceClient();
  if (!sb) return res.status(500).json({ error: 'not configured' });
  const p = String(req.query?.p || '').slice(0, 160);
  const s = String(req.query?.s || '');
  const m = String(req.query?.m || '') || undefined;

  let clinic: string | null = null;
  if (p && s) {
    if (s !== reportSig(p)) return res.status(403).json({ error: 'This report link is not valid. Please use the link from your latest ChekaMeds message.' });
    clinic = p;
    res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=3600');
  } else {
    res.setHeader('Cache-Control', 'no-store');
    const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (!token) return res.status(401).json({ error: 'Please log in to see your report.' });
    const { data, error } = await sb.auth.getUser(token);
    if (error || !data?.user) return res.status(401).json({ error: 'Please log in again.' });
    const who = await clinicForUser(sb, data.user.id);
    clinic = who.admin && p ? p : who.clinic;
    if (!clinic) return res.status(404).json({ error: 'No pharmacy is linked to this account yet. Contact info@chekameds.co.bw.' });
  }

  try {
    const report = await buildReport(sb, clinic, m);
    return res.status(200).json(report);
  } catch (e) {
    return res.status(500).json({ error: String((e as Error).message || e) });
  }
}
