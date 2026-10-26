import { useEffect, useMemo, useState } from 'react';
import BusinessReport, { type BusinessData } from '@/components/report/BusinessReport';
import { monthOptions } from '@/components/report/useReport';
import { supabase } from '@/integrations/supabase/client';

/* Business engagement report: /business?b=<business>&s=<signed>[&m=YYYY-MM] (admins can omit s). */
export default function Business() {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const b = params.get('b') || ''; const s = params.get('s') || '';
  const [month, setMonth] = useState(params.get('m') || '');
  const [data, setData] = useState<BusinessData | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const months = useMemo(monthOptions, []);

  useEffect(() => {
    let live = true; setLoading(true); setErr(null);
    (async () => {
      const qs = new URLSearchParams({ b }); if (s) qs.set('s', s); if (month) qs.set('m', month);
      const headers: Record<string, string> = {};
      if (!s) { const { data: ss } = await supabase.auth.getSession(); if (ss.session) headers.Authorization = `Bearer ${ss.session.access_token}`; }
      const r = await fetch(`/api/business-report?${qs}`, { headers });
      const j = await r.json().catch(() => ({}));
      if (!live) return;
      if (!r.ok) setErr(j.error || 'Could not load the report.'); else setData(j);
      setLoading(false);
    })().catch((e) => { if (live) { setErr(String(e)); setLoading(false); } });
    return () => { live = false; };
  }, [b, s, month]);
  useEffect(() => { document.title = data ? `${data.business} · ${data.monthLabel} | ChekaMeds business report` : 'Business report | ChekaMeds'; }, [data]);
  const onMonth = (m: string) => { setMonth(m); const u = new URL(window.location.href); u.searchParams.set('m', m); window.history.replaceState(null, '', u); };

  if (!b) return <Shell msg="This link is incomplete. Please use the link ChekaMeds sent you." />;
  if (err) return <Shell msg={err} />;
  if (!data) return <Shell msg="Building your business report…" />;
  return <div style={{ minHeight: '100vh', background: '#05060f', opacity: loading ? 0.6 : 1, transition: 'opacity .2s' }}><BusinessReport data={data} months={months} onMonth={onMonth} /></div>;
}
function Shell({ msg }: { msg: string }) {
  return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'radial-gradient(900px 600px at 20% 0%,#1b1f4d,transparent 60%),#05060f', color: 'rgba(238,240,255,.75)', fontFamily: 'Inter,system-ui,sans-serif', padding: 24, textAlign: 'center' }}><div><p style={{ color: '#e8b10b', fontWeight: 650, letterSpacing: '.14em', fontSize: 12, margin: '0 0 10px' }}>CHEKAMEDS</p><p style={{ margin: 0 }}>{msg}</p></div></div>;
}
