import { useEffect, useMemo, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import SiteHeader from '@/components/SiteHeader';
import PulseMap, { type MapTown } from '@/components/pulse/PulseMap';

/* ChekaMeds Pulse – population health early warning from medicine-search,
   stock and weather signals. Data comes from /api/pulse (aggregates only). */

type Level = 'none' | 'watch' | 'alert';
type Group = { id: string; label: string; signal: string; action: string; owner: string; climate?: 'rain' | 'heat' | 'cold' };
type Town = { id: string; name: string; lat: number; lng: number; district: string; pop: number };
type Alert = {
  week: string; town: string; townName: string; group: string; label: string; level: Level; kind: 'demand' | 'supply';
  score: number; count: number; expected: number; ratio: number; unfilledShare: number; unfilledBase: number;
  contributions: { demand: number; unfilled: number; climate: number }; reasons: string[];
  signal: string; action: string; owner: string; series: number[]; unfilledSeries: number[]; climateSeries: number[] | null;
  ack?: { status: 'new' | 'checked' | 'confirmed' | 'false_alarm'; at: string | null; notified: boolean } | null;
};
type Pulse = {
  generated_at: string; week: string;
  weather: { source: 'open-meteo' | 'climatology'; byTown: Record<string, { tmax: number[]; rain: number[] }> };
  groups: Group[]; towns: Town[];
  thresholds: { watch: number; alert: number; baselineWeeks: number; guardWeeks: number; smallCell: number };
  live: {
    alerts: Alert[]; townStatus: Record<string, { level: Level; score: number; group: string | null; searches4: number | null }>;
    weeks: string[]; weekly: { week: string; searches: number; unfilled: number; noise: number }[];
    totals: { clean: number; duplicates: number; noise: number; noiseByReason: Record<string, number>; unfilled: number; located: number; inferred?: number; locatedShare: number; channel: Record<string, number>; thisWeek: { searches: number; unfilled: number; week: string }; pharmacies: number; stockListings: number };
    signals: { group: string; label: string; level: Level; kind: string; score: number; count: number | null; expected: number; ratio: number; unfilledShare: number; last4: number | null; spark: number[]; reasons: string[] }[];
    topUnmet: { name: string; searches: number; group: string }[]; sensitiveUnmet: number | null;
    locatedByTown: { town: string; searches: number | null }[];
    stockByTown: { town: string; listings: number; inStock: number; pharmacies: number; groups: Record<string, number>; gaps: string[] }[];
    reviews?: { total: number; reviewed: number; confirmed: number; checked: number; falseAlarm: number; pending: number; delivered: number; medianHoursToReview: number | null;
      recent: { week: string; place: string; label: string; level: Level; kind: string; status: string; delivered: boolean }[] } | null;
  };
  sim: {
    weeks: string[]; alerts: Alert[]; history: { week: string; town: string; townName: string; group: string; label: string; kind: string; score: number }[];
    townStatus: Record<string, { level: Level; score: number; group: string | null }>;
    validation: { title: string; truth: string; town: string; group: string; startWeek: string; peakWeek: string; flaggedWeek: string | null; level: string; weeksAfterStart: number | null; ongoing: boolean }[];
    backtest: { trials: number; detected: number; sensitivity: number; medianLeadWeeks: number; meanLeadWeeks: number; falseAlertsPerTownMonth: number; alertsPerWeekNational: number; demandOnly: { sensitivity: number; medianLeadWeeks: number; falseAlertsPerTownMonth: number }; method: string };
    assumptions: string[];
  };
};

const fmtWeek = (w: string) => new Date(w + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const pct = (x: number) => `${Math.round(x * 100)}%`;
const LEVEL_TEXT: Record<Level, string> = { alert: 'Alert', watch: 'Watch', none: 'Normal' };

function Badge({ level, kind }: { level: Level; kind?: string }) {
  return <span className={`pl-badge ${level}`}><i />{LEVEL_TEXT[level]}{kind === 'supply' ? ' · supply' : ''}</span>;
}

function Spark({ data, color = 'var(--g)' }: { data: number[]; color?: string }) {
  const max = Math.max(1, ...data); const w = 96; const h = 26;
  const pts = data.map((v, i) => `${(i / Math.max(1, data.length - 1)) * w},${h - (v / max) * (h - 3) - 1.5}`).join(' ');
  return <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true"><polyline points={pts} fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" /></svg>;
}

function Kpi({ value, label, sub }: { value: string; label: string; sub?: string }) {
  return <div className="pl-kpi"><b>{value}</b><span>{label}</span>{sub && <em>{sub}</em>}</div>;
}

function AlertChart({ a, weeks, climate, climateLabel }: { a: Alert; weeks: string[]; climate: number[] | null; climateLabel: string | null }) {
  const n = weeks.length; const base = 6; const guard = 1;
  const data = weeks.map((w, i) => {
    const win = a.series.slice(Math.max(0, i - guard - base), Math.max(0, i - guard));
    const exp = win.length >= 3 ? win.reduce((x, y) => x + y, 0) / win.length : null;
    return { week: fmtWeek(w), searches: a.series[i], unfilled: a.unfilledSeries[i], expected: exp != null ? Math.round(exp * 10) / 10 : null, climate: climate ? climate[i] : null };
  }).slice(Math.max(0, n - 18));
  return (
    <div className="pl-chart">
      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
          <CartesianGrid stroke="rgba(255,255,255,.06)" vertical={false} />
          <XAxis dataKey="week" tick={{ fill: 'rgba(255,255,255,.5)', fontSize: 11 }} tickLine={false} axisLine={false} interval={2} />
          <YAxis yAxisId="l" tick={{ fill: 'rgba(255,255,255,.5)', fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
          {climate && <YAxis yAxisId="r" orientation="right" hide domain={[-3, 3]} />}
          <Tooltip contentStyle={{ background: '#0c0f24', border: '1px solid rgba(255,255,255,.14)', borderRadius: 10, fontSize: 12 }} labelStyle={{ color: '#fff' }} />
          <Bar yAxisId="l" dataKey="searches" name="Searches" fill="rgba(255,255,255,.28)" radius={[3, 3, 0, 0]} />
          <Bar yAxisId="l" dataKey="unfilled" name="Unfilled" fill="rgba(248,113,113,.55)" radius={[3, 3, 0, 0]} />
          <Line yAxisId="l" type="monotone" dataKey="expected" name="Expected (baseline)" stroke="#5eeaa8" strokeWidth={2} dot={false} strokeDasharray="5 4" />
          {climate && <Line yAxisId="r" type="monotone" dataKey="climate" name={climateLabel || 'Weather anomaly'} stroke="#7cc4ff" strokeWidth={1.5} dot={false} />}
        </ComposedChart>
      </ResponsiveContainer>
      <div className="pl-legend">
        <span><i style={{ background: 'rgba(255,255,255,.4)' }} />Searches</span>
        <span><i style={{ background: 'rgba(248,113,113,.7)' }} />Unfilled</span>
        <span><i className="dash" />Expected</span>
        {climate && <span><i style={{ background: '#7cc4ff' }} />{climateLabel}</span>}
      </div>
    </div>
  );
}

function Contributions({ c }: { c: Alert['contributions'] }) {
  const rows = [
    { k: 'Search demand vs baseline', v: Math.max(0, c.demand) },
    { k: 'Unfilled searches (supply stress)', v: Math.max(0, c.unfilled) },
    { k: 'Weather anomaly boost', v: c.climate },
  ];
  const max = Math.max(4, ...rows.map((r) => r.v));
  return (
    <div className="pl-contrib">
      {rows.map((r) => (
        <div key={r.k}><span>{r.k}</span><div className="bar"><i style={{ width: `${(r.v / max) * 100}%` }} /></div><b>{r.v.toFixed(1)}</b></div>
      ))}
    </div>
  );
}

export default function Pulse() {
  const [data, setData] = useState<Pulse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setModeRaw] = useState<'sim' | 'live'>('live');
  const [sel, setSel] = useState<number>(0);
  const [townFilter, setTownFilter] = useState<string | null>(null);
  const setMode = (m: 'sim' | 'live') => { setModeRaw(m); setSel(0); setTownFilter(null); };

  useEffect(() => {
    const prev = document.title; document.title = 'Pulse: early warning | ChekaMeds';
    let alive = true;
    fetch('/api/pulse').then(async (r) => { const j = await r.json(); if (!r.ok) throw new Error(j.error || 'Failed to load'); return j; })
      .then((j) => alive && setData(j)).catch((e) => alive && setError(String(e.message || e)));
    return () => { alive = false; document.title = prev; };
  }, []);

  const groupsById = useMemo(() => Object.fromEntries((data?.groups || []).map((g) => [g.id, g])), [data]);
  const townsById = useMemo(() => Object.fromEntries((data?.towns || []).map((t) => [t.id, t])), [data]);
  const allAlerts = useMemo(() => (mode === 'live' ? data?.live.alerts : data?.sim.alerts) || [], [data, mode]);
  const alerts = useMemo(() => allAlerts.filter((a) => !townFilter || a.town === townFilter), [allAlerts, townFilter]);
  const current = alerts[Math.min(sel, Math.max(0, alerts.length - 1))];

  const mapTowns: MapTown[] = useMemo(() => (data?.towns || []).map((t) => {
    if (mode === 'live') {
      const s = data!.live.townStatus?.[t.id];
      const vol = s?.searches4 == null ? 'fewer than 5 searches' : `${s.searches4} searches`;
      return { ...t, level: s?.level || 'none', note: `${s?.group ? `${LEVEL_TEXT[s.level]}: ${groupsById[s.group]?.label} · ` : ''}${vol} in the last 4 weeks` };
    }
    const s = data!.sim.townStatus[t.id];
    return { ...t, level: s?.level || 'none', note: s?.group ? `${LEVEL_TEXT[s.level]}: ${groupsById[s.group]?.label}` : 'No unusual signals' };
  }), [data, groupsById, mode]);
  const onSelectTown = useCallback((id: string) => { setTownFilter((t) => (t === id ? null : id)); setSel(0); }, []);

  const counts = useMemo(() => ({
    alert: allAlerts.filter((a) => a.level === 'alert').length,
    watch: allAlerts.filter((a) => a.level === 'watch').length,
  }), [allAlerts]);

  const climateFor = (a: Alert) => {
    const g = groupsById[a.group];
    if (!g?.climate || a.kind === 'supply') return { series: null, label: null };
    return { series: a.climateSeries, label: g.climate === 'rain' ? 'Rain anomaly (2-wk lag)' : g.climate === 'heat' ? 'Heat anomaly' : 'Cold anomaly' };
  };

  const board = data ? (
          <>
            <section className="pl-grid">
              <div className="pl-panel pl-mapwrap">
                <div className="pl-panel-h"><h2>Botswana, week of {fmtWeek(data.week)}</h2><div className="pl-key"><span><i className="a" />Alert</span><span><i className="w" />Watch</span><span><i className="n" />Normal</span></div></div>
                <PulseMap towns={mapTowns} selected={townFilter} onSelect={onSelectTown} />
                {townFilter && (() => {
                  const t = townsById[townFilter]; const mt = mapTowns.find((m) => m.id === townFilter);
                  const st = mode === 'live' ? data.live.stockByTown.find((x) => x.town === townFilter) : null;
                  const ls = mode === 'live' ? data.live.townStatus?.[townFilter] : null;
                  return (
                    <div className="pl-town">
                      <div className="pl-town-h"><div><b>{t?.name}</b><span>{t?.district} district · about {Math.round((t?.pop || 0) / 1000)}k people</span></div><Badge level={mt?.level || 'none'} /></div>
                      <div className="pl-town-s">
                        <div><b>{mode === 'live' ? (ls?.searches4 == null ? '<5' : ls.searches4) : alerts.length}</b><span>{mode === 'live' ? 'searches, last 4 weeks' : 'signals this week'}</span></div>
                        {st && <div><b>{st.pharmacies}</b><span>pharmacies with stock data</span></div>}
                        {st && <div><b>{st.inStock.toLocaleString()}</b><span>listings in stock</span></div>}
                        {st && st.gaps.length > 0 && <div className="wide"><b>{st.gaps.slice(0, 3).map((g) => groupsById[g]?.label || g).join(', ')}</b><span>thin stock (fewer than 3 listings)</span></div>}
                      </div>
                      <button className="pl-clear" onClick={() => setTownFilter(null)}>Show all towns</button>
                    </div>
                  );
                })()}
              </div>
              <div className="pl-panel pl-feed">
                <div className="pl-panel-h"><h2>Alert feed</h2><span className="pl-dim">{alerts.length} signal{alerts.length === 1 ? '' : 's'}</span></div>
                {alerts.length === 0 && <p className="pl-dim" style={{ padding: '8px 4px' }}>No unusual signals{townFilter ? ' in this town' : ''} this week{mode === 'live' ? '. Towns appear here as soon as they have enough located searches to compare with their own baseline' : ''}.</p>}
                <div className="pl-list">
                  {alerts.map((a, i) => (
                    <button key={a.town + a.group} className={`pl-item ${i === sel ? 'on' : ''}`} onClick={() => setSel(i)}>
                      <div className="top"><Badge level={a.level} kind={a.kind} /><span className="pl-dim">{a.kind === 'supply' ? `${Math.round(a.unfilledShare * 100)}% unfilled` : `score ${a.score.toFixed(1)}`}</span></div>
                      <b>{a.label} · {a.townName}</b>
                      <span>{a.reasons[0]}</span>
                      {a.ack && <em className={`pl-ack ${a.ack.status}`}>{a.ack.status === 'new' ? (a.ack.notified ? 'Sent to officers · awaiting review' : 'Awaiting review') : a.ack.status === 'checked' ? 'Checked by an officer' : a.ack.status === 'confirmed' ? 'Confirmed by an officer' : 'Marked false alarm'}</em>}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {current && (() => { const cl = climateFor(current); return (
              <section className="pl-panel pl-detail">
                <div className="pl-detail-h">
                  <div><Badge level={current.level} kind={current.kind} /><h2>{current.label} in {current.townName}</h2><p>{current.signal}</p></div>
                  <div className="pl-action"><span>Recommended action</span><p>{current.action}</p><em>Responsible: {current.owner}</em></div>
                </div>
                <div className="pl-detail-b">
                  <div><h3>Last 18 weeks</h3><AlertChart a={current} weeks={data.sim.weeks} climate={cl.series} climateLabel={cl.label} /></div>
                  <div>
                    <h3>Why Pulse raised this</h3>
                    <ul className="pl-reasons">{current.reasons.map((r) => <li key={r}>{r}</li>)}</ul>
                    <h3 style={{ marginTop: 22 }}>Score breakdown</h3>
                    <Contributions c={current.contributions} />
                    <p className="pl-fine">Watch at a score of {data.thresholds.watch}, alert at {data.thresholds.alert}. The baseline is the previous {data.thresholds.baselineWeeks} weeks, skipping the most recent one. Weather can only strengthen a real rise in searches; it never raises an alert on its own. Towns with fewer than {data.thresholds.smallCell} searches in a week are not scored.</p>
                  </div>
                </div>
              </section>
            ); })()}
          </>
  ) : null;

  return (
    <div className="cms pl">
      <style>{CSS}</style>
      <SiteHeader />
      <main className="cms-wrap" style={{ paddingBottom: 96 }}>
        <section className="pl-hero">
          <span className="cms-eyebrow"><i /> ChekaMeds Pulse · population health early warning</span>
          <h1 className="cms-h1">See health trouble coming, <span className="pl-accent">weeks earlier.</span></h1>
          <p className="cms-lead">When people start searching for ORS, antimalarials or inhalers, and can’t find them, it shows up on ChekaMeds before it reaches clinic reports. Pulse combines medicine searches, unfilled demand, pharmacy stock and weather to flag emerging risks by town. It explains every alert and names who should act.</p>
          <div className="pl-tabs" role="tablist" aria-label="Data mode">
            <button role="tab" aria-selected={mode === 'live'} className={mode === 'live' ? 'on' : ''} onClick={() => setMode('live')}>Live</button>
            <button role="tab" aria-selected={mode === 'sim'} className={mode === 'sim' ? 'on' : ''} onClick={() => setMode('sim')}>Scenario test</button>
          </div>
          <Link to="/pulse/bulletin" className="pl-bulletin">Weekly bulletin ↗</Link>
        </section>

        {error && <div className="cms-card pl-note">Pulse could not load right now ({error}). Please refresh in a minute.</div>}
        {!data && !error && <div className="pl-loading"><span /> Crunching searches, stock and weather…</div>}

        {data && mode === 'sim' && (
          <>
            <div className="pl-banner"><b>Scenario test.</b> A Botswana-wide roll-out scenario, calibrated on the real ChekaMeds search mix and {data.weather.source === 'open-meteo' ? 'real Open-Meteo weather for each town' : 'Botswana seasonal weather normals'}. Scripted events are listed under Validation so you can check the detector against a known truth. Week of {fmtWeek(data.week)}.</div>

            <div className="pl-kpis">
              <Kpi value={String(counts.alert)} label="Active alerts" sub="this week" />
              <Kpi value={String(counts.watch)} label="On watch" sub="this week" />
              <Kpi value={`${data.sim.backtest.medianLeadWeeks} wks`} label="Median early warning" sub="vs routine reporting" />
              <Kpi value={data.sim.backtest.falseAlertsPerTownMonth.toFixed(1)} label="False alerts" sub="per town per month" />
            </div>

            {board}

            <section className="pl-two">
              <div className="pl-panel">
                <div className="pl-panel-h"><h2>Back-test</h2><span className="pl-dim">{data.sim.backtest.trials} synthetic outbreaks</span></div>
                <div className="pl-bt">
                  <div><b>{pct(data.sim.backtest.sensitivity)}</b><span>outbreaks caught before routine reporting</span></div>
                  <div><b>{data.sim.backtest.medianLeadWeeks} wks</b><span>median lead time</span></div>
                  <div><b>{data.sim.backtest.alertsPerWeekNational}</b><span>alerts per week nationally (alert-fatigue check)</span></div>
                </div>
                <table className="pl-table">
                  <thead><tr><th>Detector</th><th>Caught</th><th>Median lead</th><th>False alerts / town / month</th></tr></thead>
                  <tbody>
                    <tr><td>Pulse (searches + unfilled + weather)</td><td>{pct(data.sim.backtest.sensitivity)}</td><td>{data.sim.backtest.medianLeadWeeks} wks</td><td>{data.sim.backtest.falseAlertsPerTownMonth}</td></tr>
                    <tr><td>Searches only</td><td>{pct(data.sim.backtest.demandOnly.sensitivity)}</td><td>{data.sim.backtest.demandOnly.medianLeadWeeks} wks</td><td>{data.sim.backtest.demandOnly.falseAlertsPerTownMonth}</td></tr>
                  </tbody>
                </table>
                <p className="pl-fine">{data.sim.backtest.method}</p>
              </div>
              <div className="pl-panel">
                <div className="pl-panel-h"><h2>Validation</h2><span className="pl-dim">scripted events vs what Pulse flagged</span></div>
                <table className="pl-table">
                  <thead><tr><th>Event</th><th>Started</th><th>Flagged</th><th>Result</th></tr></thead>
                  <tbody>
                    {data.sim.validation.map((v) => (
                      <tr key={v.title}>
                        <td><b>{v.title}</b><br /><span className="pl-dim">{v.truth}</span></td>
                        <td>{fmtWeek(v.startWeek)}</td>
                        <td>{v.flaggedWeek ? fmtWeek(v.flaggedWeek) : '–'}</td>
                        <td>{v.level === 'missed' ? <span className="pl-badge none"><i />Missed</span> : <><Badge level={v.level as Level} />{v.weeksAfterStart != null && <div className="pl-dim" style={{ marginTop: 4 }}>{v.weeksAfterStart === 0 ? 'in week 1' : `after ${v.weeksAfterStart + 1} weeks`}</div>}</>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="pl-panel">
              <div className="pl-panel-h"><h2>Alert history</h2><span className="pl-dim">every alert in the last {data.sim.weeks.length - 8} weeks</span></div>
              <div className="pl-hist">
                {data.sim.weeks.slice(8).map((w) => {
                  const hs = data.sim.history.filter((h) => h.week === w);
                  return (
                    <div key={w} className="col" title={hs.map((h) => `${h.label} · ${h.townName}`).join('\n') || 'No alerts'}>
                      <div className="stack">{hs.map((h) => <i key={h.town + h.group} className={h.kind === 'supply' ? 's' : ''} />)}</div>
                      <span>{fmtWeek(w)}</span>
                    </div>
                  );
                })}
              </div>
              <p className="pl-fine">Each block is one alert. Hover a week to see which towns and signals.</p>
            </section>

            <section className="pl-panel">
              <h2>Assumptions and limitations</h2>
              <ul className="pl-reasons">
                {data.sim.assumptions.map((a) => <li key={a}>{a}</li>)}
                <li>Medicine searches are a proxy signal, not a diagnosis. Alerts are prompts for a human to check clinic and lab data; they are not case counts.</li>
                <li>Small towns produce too few searches to score every week. Signals there are pooled or suppressed rather than guessed.</li>
                <li>This tab tests the detector on a simulated national roll-out with known events. The Live tab runs the same engine on real ChekaMeds data.</li>
              </ul>
            </section>
          </>
        )}

        {data && mode === 'live' && (
          <>
            <div className="pl-banner live"><b>Live.</b> Real ChekaMeds searches, pharmacy stock and Open-Meteo weather, refreshed every few hours. Searches are cleaned, grouped by illness signal and placed in a town when the person named one (now or in an earlier search). Counts below {data.thresholds.smallCell} are hidden; no names or phone numbers ever leave the database.</div>
            <div className="pl-kpis">
              <Kpi value={String(counts.alert)} label="Live alerts" sub={`${counts.watch} on watch this week`} />
              <Kpi value={data.live.totals.clean.toLocaleString()} label="Medicine searches" sub={`${data.live.weeks.length} weeks, cleaned`} />
              <Kpi value={pct(data.live.totals.clean ? data.live.totals.unfilled / data.live.totals.clean : 0)} label="Could not be filled" sub="unmet demand" />
              <Kpi value={data.live.totals.pharmacies.toString()} label="Pharmacies reporting stock" sub={`${data.live.totals.stockListings.toLocaleString()} listings`} />
            </div>

            {board}

            <section className="pl-panel">
              <div className="pl-panel-h"><h2>Weekly searches</h2><span className="pl-dim">All of Botswana</span></div>
              <ResponsiveContainer width="100%" height={230}>
                <ComposedChart data={data.live.weekly.map((w) => ({ ...w, week: fmtWeek(w.week), filled: w.searches - w.unfilled }))} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
                  <CartesianGrid stroke="rgba(255,255,255,.06)" vertical={false} />
                  <XAxis dataKey="week" tick={{ fill: 'rgba(255,255,255,.5)', fontSize: 11 }} tickLine={false} axisLine={false} interval={3} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,.5)', fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: '#0c0f24', border: '1px solid rgba(255,255,255,.14)', borderRadius: 10, fontSize: 12 }} labelStyle={{ color: '#fff' }} />
                  <Bar dataKey="filled" name="Found in stock" stackId="s" fill="#5eeaa8" />
                  <Bar dataKey="unfilled" name="Unfilled" stackId="s" fill="rgba(248,113,113,.7)" radius={[3, 3, 0, 0]} />
                  <Line type="monotone" dataKey="noise" name="Noise removed" stroke="rgba(255,255,255,.45)" strokeDasharray="4 4" dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
              <div className="pl-legend"><span><i style={{ background: '#5eeaa8' }} />Found in stock</span><span><i style={{ background: 'rgba(248,113,113,.8)' }} />Unfilled</span><span><i className="dash w" />Noise removed</span></div>
            </section>

            <section className="pl-panel">
              <div className="pl-panel-h"><h2>Signals by illness group</h2><span className="pl-dim">week of {fmtWeek(data.week)}</span></div>
              <table className="pl-table pl-signals">
                <thead><tr><th>Group</th><th>Last 12 weeks</th><th>Last 4 weeks</th><th>Unfilled</th><th>Status</th></tr></thead>
                <tbody>
                  {data.live.signals.map((s) => (
                    <tr key={s.group}>
                      <td><b>{s.label}</b><br /><span className="pl-dim">{groupsById[s.group]?.signal}</span></td>
                      <td><Spark data={s.spark} color={s.level === 'alert' ? '#f87171' : s.level === 'watch' ? '#fbbf5a' : '#5eeaa8'} /></td>
                      <td>{s.last4 == null ? '<5' : s.last4}</td>
                      <td>{s.count ? pct(s.unfilledShare) : '–'}</td>
                      <td><Badge level={s.level} kind={s.kind} />{s.reasons[0] && <div className="pl-dim" style={{ marginTop: 4 }}>{s.reasons[0]}</div>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className="pl-two">
              <div className="pl-panel">
                <div className="pl-panel-h"><h2>Most-wanted, hardest to find</h2><span className="pl-dim">last 13 weeks</span></div>
                <ol className="pl-unmet">
                  {data.live.topUnmet.map((u) => <li key={u.name}><span>{u.name}</span><em>{groupsById[u.group]?.label || 'Other'}</em><b>{u.searches}</b></li>)}
                </ol>
                {data.live.sensitiveUnmet != null && data.live.sensitiveUnmet > 0 && <p className="pl-fine">{data.live.sensitiveUnmet} further unfilled searches were for sexual and reproductive health medicines. These are counted but not named.</p>}
              </div>
              <div className="pl-panel">
                <div className="pl-panel-h"><h2>Stock coverage by town</h2><span className="pl-dim">real pharmacy listings</span></div>
                <table className="pl-table">
                  <thead><tr><th>Town</th><th>Pharmacies</th><th>In stock</th><th>Thin cover</th></tr></thead>
                  <tbody>
                    {data.live.stockByTown.slice(0, 8).map((s) => (
                      <tr key={s.town}><td><b>{townsById[s.town]?.name || s.town}</b></td><td>{s.pharmacies}</td><td>{s.inStock.toLocaleString()}</td>
                        <td className="pl-dim">{s.gaps.length ? s.gaps.map((g) => groupsById[g]?.label).join(', ') : 'None'}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {data.live.reviews && data.live.reviews.total > 0 && (() => { const rv = data.live.reviews!; return (
              <section className="pl-panel">
                <div className="pl-panel-h"><h2>What officers decided</h2><span className="pl-dim">every alert is reviewed by a person</span></div>
                <div className="pl-bt">
                  <div><b>{rv.delivered} / {rv.total}</b><span>alerts delivered to officers</span></div>
                  <div><b>{rv.reviewed}</b><span>reviewed{rv.pending ? ` · ${rv.pending} awaiting` : ''}</span></div>
                  <div><b>{rv.confirmed + rv.checked}</b><span>confirmed or checked ({rv.confirmed} / {rv.checked})</span></div>
                  <div><b>{rv.falseAlarm}</b><span>marked false alarm</span></div>
                  {rv.medianHoursToReview != null && <div><b>{rv.medianHoursToReview < 1 ? `${Math.round(rv.medianHoursToReview * 60)} min` : `${rv.medianHoursToReview} h`}</b><span>median time from alert to review</span></div>}
                </div>
                <div className="pl-tablewrap" style={{ marginTop: 14 }}>
                  <table className="pl-table">
                    <thead><tr><th>Week</th><th>Place</th><th>Signal</th><th>Level</th><th>Outcome</th></tr></thead>
                    <tbody>{rv.recent.map((r, i) => (
                      <tr key={i}><td>{fmtWeek(r.week)}</td><td>{r.place}</td><td>{r.label}{r.kind === 'supply' ? ' (supply)' : ''}</td><td><Badge level={r.level} /></td>
                        <td><em className={`pl-ack ${r.status}`}>{r.status === 'new' ? (r.delivered ? 'Sent · awaiting review' : 'Awaiting review') : r.status === 'checked' ? 'Checked' : r.status === 'confirmed' ? 'Confirmed' : 'False alarm'}</em></td></tr>
                    ))}</tbody>
                  </table>
                </div>
                <p className="pl-fine">False alarms are kept, not hidden: they show where Pulse needs tuning. Officer names and notes are visible only to ChekaMeds admins.</p>
              </section>
            ); })()}

            <section className="pl-panel">
              <h2>Data quality, honestly</h2>
              <div className="pl-bt">
                <div><b>{pct(data.live.totals.locatedShare)}</b><span>of searches placed in a town{data.live.totals.inferred ? ` (${data.live.totals.inferred} from the person's earlier searches)` : ''}</span></div>
                <div><b>{Object.entries(data.live.totals.channel).map(([k, v]) => `${pct(v / Math.max(1, data.live.totals.clean))} ${k}`).join(' · ')}</b><span>search channels</span></div>
                <div><b>{data.live.totals.thisWeek.searches}</b><span>searches so far this week</span></div>
              </div>
              <p className="pl-fine">Cleaning removed {data.live.totals.noise} adverts, greetings and test messages, and {data.live.totals.duplicates || 0} repeat searches (the same person searching the same medicine in the same week counts once). The WhatsApp bot now asks for a town when it doesn't know one and remembers it for that number, so the share of located searches, and the town-level live alerts, grow every week.</p>
            </section>
          </>
        )}

        {data && (
          <section className="pl-panel pl-gov">
            <h2>Privacy and responsible use</h2>
            <div className="cms-grid-3">
              <div><h3>Aggregates only</h3><p>Pulse reads searches on the server and publishes only weekly counts by town and medicine group. Phone numbers and individual searches never reach this page.</p></div>
              <div><h3>Small numbers hidden</h3><p>Any count below {data.thresholds.smallCell} is suppressed. Sexual and reproductive health searches are counted but never named. Nothing here can be used to single out a person, an employee or a patient.</p></div>
              <div><h3>Explainable, human in the loop</h3><p>Rules, not a black box: every alert shows the numbers behind it. Alerts prompt a responsible officer to check. They never trigger action against individuals. See our <Link to="/privacy">Privacy Policy</Link>.</p></div>
            </div>
            <p className="pl-fine">Built by IBLIM Enterprises (Pty) Ltd for the Future Health Digital Innovation Challenge: Population and Workforce Health Early Warning. Updated {new Date(data.generated_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}.</p>
          </section>
        )}
      </main>
    </div>
  );
}

const CSS = `
.pl .pl-hero{padding:56px 0 28px;max-width:900px}
.pl .pl-hero .cms-h1{margin-top:14px;font-size:clamp(2.3rem,5vw,4rem)}
.pl .pl-accent{color:#e8b10b}
.pl .pl-hero .cms-lead{margin-top:16px;max-width:760px}
.pl-tabs{display:inline-flex;gap:4px;margin-top:26px;padding:4px;border-radius:999px;background:rgba(17,16,15,.35);border:1px solid var(--line);backdrop-filter:blur(20px)}
.pl-tabs button{padding:10px 18px;border-radius:999px;color:var(--ink-2);font:500 .92rem var(--body);background:none;border:0;cursor:pointer}
.pl-tabs button.on{background:#e9e9e9;color:#0a0707}
.pl .pl-bulletin{display:inline-flex;margin:26px 0 0 12px;padding:11px 16px;border-radius:999px;border:1px solid var(--line-2);color:#fff;font-size:.9rem;vertical-align:top}
.pl .pl-bulletin:hover{background:rgba(255,255,255,.06)}
.pl-tablewrap{overflow-x:auto}
.pl-ack{font-style:normal;font-size:.76rem;color:var(--muted)}
.pl-ack.confirmed{color:#fca5a5}.pl-ack.checked{color:#fbbf5a}.pl-ack.false_alarm{color:#5eeaa8}
.pl-banner{margin:6px 0 18px;padding:14px 18px;border-radius:14px;border:1px solid rgba(124,196,255,.28);background:rgba(124,196,255,.07);color:var(--ink-2);font-size:.92rem;line-height:1.55}
.pl-banner.live{border-color:var(--g-line);background:var(--g-soft)}
.pl-banner b{color:#fff}
.pl-loading{display:flex;align-items:center;gap:12px;color:var(--muted);padding:40px 0}
.pl-loading span{width:16px;height:16px;border-radius:50%;border:2px solid var(--line-2);border-top-color:var(--g);animation:plspin 0.9s linear infinite}
@keyframes plspin{to{transform:rotate(360deg)}}
.pl-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:16px}
.pl-kpi{padding:18px 20px;border-radius:18px;background:var(--surface);border:1px solid var(--line);display:grid;gap:2px}
.pl-kpi b{font-size:clamp(1.7rem,3vw,2.3rem);font-weight:700;color:#e8b10b;letter-spacing:-.02em}
.pl-kpi span{color:#fff;font-size:.92rem}
.pl-kpi em{font-style:normal;color:var(--dim);font-size:.8rem}
.pl-panel{background:var(--surface);border:1px solid var(--line);border-radius:22px;padding:22px;margin-bottom:16px}
.pl-panel h2{font-size:1.15rem;font-weight:500;margin:0}
.pl-panel h3{font-size:.95rem;font-weight:500;margin:0 0 10px;color:#fff}
.pl-panel-h{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px;flex-wrap:wrap}
.pl-dim{color:var(--dim);font-size:.84rem}
.pl-grid{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(0,1fr);gap:16px}
.pl-grid .pl-panel{margin-bottom:16px}
.pl-mapwrap{position:relative}
.pulse-map{height:470px;border-radius:16px;overflow:hidden;background:radial-gradient(120% 90% at 50% 40%,#0e1226 0%,#090b18 100%)}
.pulse-map .leaflet-control-attribution{background:rgba(8,10,25,.7)!important;color:rgba(255,255,255,.45)!important;font-size:10px}
.pulse-map .leaflet-control-attribution a{color:rgba(255,255,255,.6)!important}
.pulse-map .leaflet-bar a{background:#14172b!important;color:#fff!important;border-color:rgba(255,255,255,.1)!important}
.pulse-label span{position:absolute;white-space:nowrap;font:500 11.5px var(--body);color:rgba(255,255,255,.72);text-shadow:0 1px 3px #000,0 0 6px #000;pointer-events:none}
.pulse-label.hot span{color:#fff;font-weight:600}
.pulse-label.sel span{color:#e8b10b;font-weight:650}
.pulse-tip{background:#0c0f24!important;color:#fff!important;border:1px solid rgba(255,255,255,.15)!important;border-radius:8px!important;font:12px var(--body)!important}
.pulse-tip:before{display:none}
.pulse-ring{animation:plring 2.2s ease-out infinite;transform-origin:center;transform-box:fill-box}
@keyframes plring{0%{opacity:.6}100%{opacity:0}}
@media (prefers-reduced-motion: reduce){.pulse-ring{animation:none}}
.pl-key{display:flex;gap:12px;font-size:.8rem;color:var(--muted)}
.pl-key span{display:inline-flex;align-items:center;gap:6px}
.pl-key i{width:9px;height:9px;border-radius:50%}
.pl-key i.a{background:#f87171}.pl-key i.w{background:#fbbf5a}.pl-key i.n{background:#5eeaa8;opacity:.6}
.pl-town{margin-top:12px;padding:14px;border:1px solid var(--line-2);border-radius:14px;background:rgba(255,255,255,.03)}
.pl-town-h{display:flex;justify-content:space-between;align-items:flex-start;gap:10px}
.pl-town-h b{display:block;font-size:1.05rem}.pl-town-h span{font-size:.8rem;color:rgba(255,255,255,.6)}
.pl-town-s{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:12px}
.pl-town-s div{display:grid;gap:2px}.pl-town-s .wide{grid-column:1/-1}
.pl-town-s b{font-size:1rem}.pl-town-s span{font-size:.74rem;color:rgba(255,255,255,.58)}
.pl-clear{margin-top:10px;font-size:.84rem;color:#fff;background:rgba(255,255,255,.08);border:1px solid var(--line-2);border-radius:999px;padding:7px 14px;cursor:pointer}
.pl-feed{display:flex;flex-direction:column;max-height:560px}
.pl-list{display:grid;gap:8px;overflow:auto;padding-right:2px}
.pl-item{text-align:left;padding:14px;border-radius:14px;background:rgba(255,255,255,.03);border:1px solid var(--line);color:var(--ink-2);display:grid;gap:6px;cursor:pointer;font:inherit}
.pl-item:hover{background:rgba(255,255,255,.06)}
.pl-item.on{border-color:rgba(255,255,255,.5);background:rgba(255,255,255,.07)}
.pl-item .top{display:flex;justify-content:space-between;align-items:center}
.pl-item b{color:#fff;font-weight:500}
.pl-item > span{font-size:.86rem;line-height:1.45;color:var(--muted)}
.pl-badge{display:inline-flex;align-items:center;gap:6px;font-size:.74rem;font-weight:600;padding:5px 9px;border-radius:999px;white-space:nowrap}
.pl-badge i{width:6px;height:6px;border-radius:50%;background:currentColor}
.pl-badge.alert{background:rgba(248,113,113,.14);color:#fca5a5}
.pl-badge.watch{background:rgba(251,191,90,.14);color:#fbbf5a}
.pl-badge.none{background:rgba(94,234,168,.12);color:#5eeaa8}
.pl-detail-h{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,1fr);gap:20px;align-items:start;margin-bottom:18px}
.pl-detail-h h2{font-size:1.5rem;margin:10px 0 6px}
.pl-detail-h p{color:var(--muted);margin:0;line-height:1.55}
.pl-action{padding:16px 18px;border-radius:16px;background:rgba(232,177,11,.08);border:1px solid rgba(232,177,11,.3)}
.pl-action span{font-size:.78rem;color:#e8b10b;font-weight:600;letter-spacing:.02em;text-transform:uppercase}
.pl-action p{color:#fff;margin:6px 0 8px;line-height:1.5}
.pl-action em{font-style:normal;font-size:.84rem;color:var(--muted)}
.pl-detail-b{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,1fr);gap:24px}
.pl-legend{display:flex;flex-wrap:wrap;gap:14px;margin-top:8px;font-size:.78rem;color:var(--muted)}
.pl-legend span{display:inline-flex;align-items:center;gap:6px}
.pl-legend i{width:10px;height:10px;border-radius:2px;display:inline-block}
.pl-legend i.dash{height:0;width:14px;border-top:2px dashed #5eeaa8;border-radius:0}
.pl-legend i.dash.w{border-top-color:rgba(255,255,255,.5)}
.pl-reasons{margin:0;padding-left:18px;display:grid;gap:7px;color:var(--ink-2);line-height:1.55;font-size:.94rem}
.pl-contrib{display:grid;gap:10px}
.pl-contrib > div{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,1fr) 34px;gap:10px;align-items:center;font-size:.86rem;color:var(--muted)}
.pl-contrib .bar{height:8px;border-radius:99px;background:rgba(255,255,255,.07);overflow:hidden}
.pl-contrib .bar i{display:block;height:100%;background:#e8b10b;border-radius:99px}
.pl-contrib b{color:#fff;font-weight:600;text-align:right}
.pl-fine{color:var(--dim);font-size:.8rem;line-height:1.55;margin:14px 0 0}
.pl-two{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:16px}
.pl-two .pl-panel{margin-bottom:16px}
.pl-bt{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:4px 0 16px}
.pl-bt div{padding:14px;border-radius:14px;background:rgba(255,255,255,.03);border:1px solid var(--line);display:grid;gap:4px}
.pl-bt b{font-size:1.45rem;font-weight:700;color:#e8b10b}
.pl-bt span{font-size:.8rem;color:var(--muted);line-height:1.4}
.pl-table{width:100%;border-collapse:collapse;font-size:.88rem}
.pl-table th{text-align:left;font-weight:500;color:var(--dim);font-size:.78rem;padding:8px 10px;border-bottom:1px solid var(--line)!important}
.pl-table td{padding:11px 10px;border-bottom:1px solid var(--line)!important;color:var(--ink-2);vertical-align:top}
.pl-table td b{color:#fff;font-weight:500}
.pl-signals td{vertical-align:middle}
.pl-hist{display:flex;gap:4px;align-items:flex-end;overflow-x:auto;padding-bottom:4px}
.pl-hist .col{flex:1;min-width:30px;display:grid;gap:6px;justify-items:center}
.pl-hist .stack{display:flex;flex-direction:column-reverse;gap:2px;min-height:64px;justify-content:flex-start;width:100%;align-items:center}
.pl-hist .stack i{width:70%;height:9px;border-radius:2px;background:#f87171}
.pl-hist .stack i.s{background:#fbbf5a}
.pl-hist span{font-size:.66rem;color:var(--dim);white-space:nowrap;transform:rotate(-45deg);transform-origin:center;margin-top:8px;height:28px}
.pl-unmet{margin:0;padding:0;list-style:none;display:grid;gap:2px;counter-reset:u}
.pl-unmet li{display:grid;grid-template-columns:24px minmax(0,1fr) auto 40px;gap:10px;align-items:center;padding:9px 6px;border-bottom:1px solid var(--line);counter-increment:u;font-size:.9rem}
.pl-unmet li:before{content:counter(u);color:var(--dim);font-size:.8rem}
.pl-unmet span{color:#fff;text-transform:capitalize;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pl-unmet em{font-style:normal;color:var(--dim);font-size:.78rem}
.pl-unmet b{text-align:right;color:#fca5a5;font-weight:600}
.pl-gov h3{margin-top:14px}
.pl-gov p{color:var(--muted);line-height:1.55;font-size:.92rem;margin:0}
.pl-gov a{color:#fff;text-decoration:underline;text-underline-offset:3px}
.pl-note{color:#fca5a5}
@media (max-width:1000px){.pl-grid,.pl-two,.pl-detail-h,.pl-detail-b{grid-template-columns:1fr}.pl-kpis{grid-template-columns:1fr 1fr}.pulse-map{height:380px}.pl-feed{max-height:none}}
@media (max-width:560px){.pl-tabs button{white-space:nowrap;padding:9px 13px;font-size:.84rem}.pl-bt{grid-template-columns:1fr}.pl-panel{padding:16px}.pl-table{font-size:.82rem}.pl-table th,.pl-table td{padding:9px 6px}.pulse-map{height:320px}}
`;
