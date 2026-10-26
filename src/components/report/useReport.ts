import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { ReportData } from './PharmacyReport';

/** Last 6 months plus the current month to date (Gaborone time). */
export function monthOptions(): { value: string; label: string }[] {
  const now = new Date(Date.now() + 2 * 3600e3);
  const out: { value: string; label: string }[] = [];
  for (let i = 0; i <= 6; i++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const v = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    out.push({ value: v, label: `${d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' })}${i === 0 ? ' (so far)' : ''}` });
  }
  return out;
}

/** Loads a report either by signed link (p + s) or with the logged-in session. */
export function useReport(opts: { p?: string; s?: string; month?: string; auth?: boolean; adminClinic?: string }) {
  const [data, setData] = useState<ReportData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let live = true;
    setLoading(true); setError(null);
    (async () => {
      const qs = new URLSearchParams();
      if (opts.p && opts.s) { qs.set('p', opts.p); qs.set('s', opts.s); }
      if (opts.adminClinic) qs.set('p', opts.adminClinic);
      if (opts.month) qs.set('m', opts.month);
      const headers: Record<string, string> = {};
      if (opts.auth) { const { data: s } = await supabase.auth.getSession(); if (s.session) headers.Authorization = `Bearer ${s.session.access_token}`; }
      const r = await fetch(`/api/pharmacy-report?${qs}`, { headers });
      const j = await r.json().catch(() => ({}));
      if (!live) return;
      if (!r.ok) setError(j.error || 'Could not load the report.'); else setData(j);
      setLoading(false);
    })().catch((e) => { if (live) { setError(String(e?.message || e)); setLoading(false); } });
    return () => { live = false; };
  }, [opts.p, opts.s, opts.month, opts.auth, opts.adminClinic]);
  return { data, error, loading };
}
