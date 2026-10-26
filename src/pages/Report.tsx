import { useEffect, useMemo, useState } from 'react';
import PharmacyReport from '@/components/report/PharmacyReport';
import { monthOptions, useReport } from '@/components/report/useReport';

/* Public, signed monthly market report: /report?p=<pharmacy>&s=<signature>[&m=YYYY-MM] */
export default function Report() {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const p = params.get('p') || ''; const s = params.get('s') || '';
  const [month, setMonth] = useState(params.get('m') || '');
  const { data, error, loading } = useReport({ p, s, month: month || undefined });
  const months = useMemo(monthOptions, []);
  useEffect(() => { document.title = data ? `${data.clinic} · ${data.monthLabel} | ChekaMeds report` : 'Market report | ChekaMeds'; }, [data]);

  const onMonth = (m: string) => {
    setMonth(m);
    const u = new URL(window.location.href); u.searchParams.set('m', m); window.history.replaceState(null, '', u);
  };

  if (!p || !s) return <Shell msg="This report link is incomplete. Please open it from your latest ChekaMeds message." />;
  if (error) return <Shell msg={error} />;
  if (loading && !data) return <Shell msg="Building your report…" spin />;
  return <div style={{ minHeight: '100vh', background: '#05060f', opacity: loading ? 0.6 : 1, transition: 'opacity .2s' }}>{data && <PharmacyReport data={data} months={months} onMonth={onMonth} />}</div>;
}

function Shell({ msg, spin }: { msg: string; spin?: boolean }) {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'radial-gradient(900px 600px at 20% 0%,#1b1f4d,transparent 60%),#05060f', color: 'rgba(238,240,255,.75)', fontFamily: 'Inter,system-ui,sans-serif', padding: 24, textAlign: 'center' }}>
      <div><p style={{ color: '#e8b10b', fontWeight: 650, letterSpacing: '.14em', fontSize: 12, margin: '0 0 10px' }}>CHEKAMEDS</p><p style={{ margin: 0, fontSize: 16 }}>{spin ? '⏳ ' : ''}{msg}</p></div>
    </div>
  );
}
