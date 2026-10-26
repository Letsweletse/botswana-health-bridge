import { serviceClient, requireAdmin } from './_pulse/notify-lib.js';
import { loadReportContext } from './_pulse/report-lib.js';
import { computeBusiness, businessSig, businessUrl, listBusinesses } from './_pulse/business-lib.js';

/* Business engagement report for a multi-branch pharmacy business.
   ?b=<business>&s=<signed>      shareable link for the business owner
   Bearer <admin>  ?b=<business> ChekaMeds admin
   Bearer <admin>  ?list=1       businesses on ChekaMeds with their shareable links
   ?m=YYYY-MM | current. Default: last complete month. */

type ApiResponse = { status: (code: number) => ApiResponse; json: (body: unknown) => void; setHeader: (n: string, v: string) => void };
type ApiRequest = { headers: Record<string, string | string[] | undefined>; query?: Record<string, string | string[]> };
export const maxDuration = 60;

export default async function handler(req: ApiRequest, res: ApiResponse) {
  const sb = serviceClient();
  if (!sb) return res.status(500).json({ error: 'not configured' });
  const b = String(req.query?.b || '').slice(0, 80);
  const s = String(req.query?.s || '');
  const m = String(req.query?.m || '') || undefined;
  const signed = !!(b && s && s === businessSig(b));
  if (b && s && !signed) return res.status(403).json({ error: 'This report link is not valid. Please use the latest link from ChekaMeds.' });
  if (!signed) {
    const admin = await requireAdmin(sb, req.headers.authorization as string | undefined);
    if (!admin.ok) return res.status(401).json({ error: 'Admins only, or use the shareable link.' });
  }
  res.setHeader('Cache-Control', signed ? 's-maxage=600, stale-while-revalidate=1800' : 'no-store');
  try {
    const ctx = await loadReportContext(sb, m);
    if (String(req.query?.list || '') === '1') {
      return res.status(200).json({ businesses: listBusinesses(ctx.stock).map((x) => ({ ...x, url: businessUrl(x.name) })) });
    }
    if (!b) return res.status(400).json({ error: 'Choose a business.' });
    const r = computeBusiness(ctx, b);
    if (!r.headline.branches) return res.status(404).json({ error: `No branches found whose name starts with "${b}".` });
    return res.status(200).json(r);
  } catch (e) {
    return res.status(500).json({ error: String((e as Error).message || e) });
  }
}
