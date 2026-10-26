import { useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import PharmacyReport from './PharmacyReport';
import { monthOptions, useReport } from './useReport';

/* Market insights tab in the pharmacy dashboard: the logged-in pharmacy's own report. */
export default function InsightsPanel() {
  const months = useMemo(monthOptions, []);
  const [month, setMonth] = useState(months[0].value); // month to date by default
  const { data, error, loading } = useReport({ auth: true, month });
  if (error) return <div className="gn-empty">{error}</div>;
  if (!data) return <div className="flex items-center gap-2 text-muted-foreground py-16 justify-center"><Loader2 className="h-5 w-5 animate-spin" /> Building your market report…</div>;
  return <div style={{ opacity: loading ? 0.6 : 1, transition: 'opacity .2s' }}><PharmacyReport data={data} months={months} onMonth={setMonth} compact /></div>;
}
