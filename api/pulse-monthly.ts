import { serviceClient } from './_pulse/notify-lib.js';
import { loadReportContext, computeReport, NATIONAL } from './_pulse/report-lib.js';

/* ChekaMeds Pulse consolidated monthly bulletin: all towns, all pharmacies, aggregated.
   Public (no pharmacy names, no personal data). ?m=YYYY-MM | current. Default: last complete month. */

type ApiResponse = { status: (code: number) => ApiResponse; json: (body: unknown) => void; setHeader: (n: string, v: string) => void };
type ApiRequest = { query?: Record<string, string | string[]> };
export const maxDuration = 60;

export default async function handler(req: ApiRequest, res: ApiResponse) {
  const sb = serviceClient();
  if (!sb) return res.status(500).json({ error: 'not configured' });
  const m = String(req.query?.m || '') || undefined;
  try {
    const ctx = await loadReportContext(sb, m);
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1800');
    return res.status(200).json(computeReport(ctx, NATIONAL));
  } catch (e) {
    return res.status(500).json({ error: String((e as Error).message || e) });
  }
}
