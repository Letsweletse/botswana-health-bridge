import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PharmacyReport, { type ReportData } from '@/components/report/PharmacyReport';
import { monthOptions } from '@/components/report/useReport';

/* ChekaMeds Pulse consolidated national monthly bulletin: /pulse/monthly[?m=YYYY-MM] */
export default function PulseMonthly() {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const [month, setMonth] = useState(params.get('m') || '');
  const [data, setData] = useState<ReportData | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const months = useMemo(monthOptions, []);

  useEffect(() => {
    let live = true; setLoading(true); setErr(null);
    fetch(`/api/pulse-monthly${month ? `?m=${month}` : ''}`).then(async (r) => {
      const j = await r.json().catch(() => ({}));
      if (!live) return;
      if (!r.ok) setErr(j.error || 'Could not load the bulletin.'); else setData(j);
      setLoading(false);
    }).catch((e) => { if (live) { setErr(String(e)); setLoading(false); } });
    return () => { live = false; };
  }, [month]);
  useEffect(() => { document.title = data ? `Pulse national bulletin · ${data.monthLabel} | ChekaMeds` : 'Pulse national bulletin | ChekaMeds'; }, [data]);

  const onMonth = (m: string) => { setMonth(m); const u = new URL(window.location.href); u.searchParams.set('m', m); window.history.replaceState(null, '', u); };

  if (!data) return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'radial-gradient(900px 600px at 20% 0%,#1b1f4d,transparent 60%),#05060f', color: 'rgba(238,240,255,.75)', fontFamily: 'Inter,system-ui,sans-serif', padding: 24, textAlign: 'center' }}>
      <p>{err || 'Building the national bulletin…'}</p>
    </div>
  );
  return (
    <div style={{ minHeight: '100vh', background: '#05060f', opacity: loading ? 0.6 : 1, transition: 'opacity .2s' }}>
      <div style={{ position: 'absolute', top: 14, right: 18, zIndex: 5, display: 'flex', gap: 14, fontFamily: 'Inter,system-ui,sans-serif', fontSize: 13 }}>
        <Link to="/pulse" style={{ color: 'rgba(238,240,255,.7)' }}>Pulse dashboard</Link>
        <Link to="/pulse/bulletin" style={{ color: 'rgba(238,240,255,.7)' }}>Weekly bulletin</Link>
      </div>
      <PharmacyReport data={data} months={months} onMonth={onMonth} />
    </div>
  );
}
