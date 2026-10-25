import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

/* ChekaMeds Pulse – weekly bulletin.
   A printable, one-document summary of the live signals for district health teams,
   Central Medical Stores and the Ministry. Sent on Tuesdays so it lands before the
   Wednesday IDSR deadline. "Download data" exports a DHIS2 data value set (CSV). */

type Level = 'none' | 'watch' | 'alert';
type Alert = {
  town: string; townName: string; group: string; label: string; level: Level; kind: 'demand' | 'supply';
  score: number; count: number; expected: number; ratio: number; unfilledShare: number; reasons: string[];
  signal: string; action: string; owner: string;
};
type Data = {
  generated_at: string; week: string;
  weather: { source: string };
  groups: { id: string; label: string; signal: string }[];
  towns: { id: string; name: string; district: string }[];
  thresholds: { smallCell: number };
  live: {
    alerts: Alert[];
    townStatus: Record<string, { level: Level; group: string | null; searches4: number | null }>;
    weeks: string[];
    totals: { clean: number; unfilled: number; located: number; locatedShare: number; pharmacies: number; stockListings: number; noise: number; duplicates?: number };
    signals: { group: string; label: string; level: Level; count: number | null; expected: number; ratio: number; unfilledShare: number; last4: number | null; spark: number[] }[];
    topUnmet: { name: string; searches: number; group: string }[];
    stockByTown: { town: string; pharmacies: number; inStock: number; gaps: string[] }[];
  };
};

/* ISO-8601 week, e.g. 2026W42 (DHIS2 weekly period format). */
export function isoWeek(mondayIso: string): string {
  const d = new Date(mondayIso + 'T00:00:00Z');
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 3)); // Thursday of that week
  const firstThu = new Date(Date.UTC(t.getUTCFullYear(), 0, 4));
  const wk = 1 + Math.round(((t.getTime() - firstThu.getTime()) / 864e5 - 3 + ((firstThu.getUTCDay() + 6) % 7)) / 7);
  return `${t.getUTCFullYear()}W${wk}`;
}
const fmt = (w: string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }) =>
  new Date(w + 'T00:00:00Z').toLocaleDateString('en-GB', { ...opts, timeZone: 'UTC' });
const weekEnd = (w: string) => new Date(new Date(w + 'T00:00:00Z').getTime() + 6 * 864e5).toISOString().slice(0, 10);
const pct = (x: number) => `${Math.round(x * 100)}%`;

function toCsv(d: Data): string {
  const period = isoWeek(d.week);
  const rows: string[][] = [['dataElement', 'period', 'orgUnit', 'categoryOptionCombo', 'attributeOptionCombo', 'value', 'comment']];
  for (const s of d.live.signals) {
    const g = s.group.toUpperCase();
    if (s.count != null) rows.push([`PULSE_SEARCHES_${g}`, period, 'BOTSWANA', '', '', String(s.count), 'ChekaMeds medicine searches, cleaned, de-duplicated']);
    if (s.count != null) rows.push([`PULSE_UNFILLED_PCT_${g}`, period, 'BOTSWANA', '', '', String(Math.round(s.unfilledShare * 100)), 'Share of searches no pharmacy could fill']);
    rows.push([`PULSE_STATUS_${g}`, period, 'BOTSWANA', '', '', s.level === 'alert' ? '2' : s.level === 'watch' ? '1' : '0', '0 normal, 1 watch, 2 alert']);
  }
  for (const a of d.live.alerts) {
    if (a.town === 'botswana') continue;
    rows.push([`PULSE_STATUS_${a.group.toUpperCase()}`, period, a.town.toUpperCase(), '', '', a.level === 'alert' ? '2' : '1', `${a.townName}: ${a.reasons[0]}`]);
  }
  const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  return rows.map((r) => r.map(esc).join(',')).join('\n');
}

export default function PulseBulletin() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const prev = document.title;
    let alive = true;
    fetch('/api/pulse').then(async (r) => { const j = await r.json(); if (!r.ok) throw new Error(j.error || 'Failed to load'); return j; })
      .then((j: Data) => { if (!alive) return; setData(j); document.title = `ChekaMeds Pulse bulletin ${isoWeek(j.week)}`; })
      .catch((e) => alive && setError(String(e.message || e)));
    return () => { alive = false; document.title = prev; };
  }, []);

  const groupsById = useMemo(() => Object.fromEntries((data?.groups || []).map((g) => [g.id, g])), [data]);
  const townsById = useMemo(() => Object.fromEntries((data?.towns || []).map((t) => [t.id, t])), [data]);

  const download = () => {
    if (!data) return;
    const blob = new Blob([toCsv(data)], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `chekameds-pulse-${isoWeek(data.week)}.csv`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  if (error) return <div className="pb"><style>{CSS}</style><main className="pb-page"><p>Bulletin could not load ({error}). Please refresh in a minute.</p></main></div>;
  if (!data) return <div className="pb"><style>{CSS}</style><main className="pb-page"><p className="pb-muted">Preparing this week's bulletin…</p></main></div>;

  const L = data.live;
  const alerts = L.alerts.filter((a) => a.level === 'alert');
  const watches = L.alerts.filter((a) => a.level === 'watch');

  return (
    <div className="pb">
      <style>{CSS}</style>
      <div className="pb-bar no-print">
        <Link to="/pulse">← Back to Pulse</Link>
        <div>
          <button onClick={download}>Download data (DHIS2 CSV)</button>
          <button className="primary" onClick={() => window.print()}>Print / save as PDF</button>
        </div>
      </div>

      <main className="pb-page">
        <div className="pb-head">
          <div>
            <p className="pb-kicker">ChekaMeds Pulse · Weekly early-warning bulletin</p>
            <h1>Week {isoWeek(data.week).split('W')[1]}, {fmt(data.week, { year: 'numeric' })}</h1>
            <p className="pb-muted">{fmt(data.week)} to {fmt(weekEnd(data.week))} · issued {new Date(data.generated_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</p>
          </div>
          <div className="pb-for">
            <b>For</b> District Health Management Teams, Central Medical Stores, Ministry of Health disease surveillance
          </div>
        </div>

        <section className="pb-kpis">
          <div><b className={alerts.length ? 'red' : ''}>{alerts.length}</b><span>alerts</span></div>
          <div><b className={watches.length ? 'amber' : ''}>{watches.length}</b><span>on watch</span></div>
          <div><b>{L.totals.clean.toLocaleString()}</b><span>medicine searches (26 weeks)</span></div>
          <div><b>{pct(L.totals.clean ? L.totals.unfilled / L.totals.clean : 0)}</b><span>could not be filled</span></div>
          <div><b>{L.totals.pharmacies}</b><span>pharmacies reporting stock</span></div>
        </section>

        <section>
          <h2>1. Signals needing attention</h2>
          {L.alerts.length === 0 ? <p>No unusual signals this week.</p> : (
            <table>
              <thead><tr><th>Status</th><th>Where</th><th>Signal</th><th>Evidence</th><th>Suggested action</th><th>Responsible</th></tr></thead>
              <tbody>
                {L.alerts.map((a) => (
                  <tr key={a.town + a.group}>
                    <td><span className={`pb-tag ${a.level}`}>{a.level === 'alert' ? 'Alert' : 'Watch'}{a.kind === 'supply' ? ' · supply' : ''}</span></td>
                    <td><b>{a.townName}</b></td>
                    <td><b>{a.label}</b><br /><span className="pb-muted">{a.signal}</span></td>
                    <td>{a.reasons.map((r) => <div key={r}>{r}</div>)}</td>
                    <td>{a.action}</td>
                    <td>{a.owner}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="pb-note">Signals are prompts to verify against clinic, laboratory and stock data. They are not case counts and not a diagnosis.</p>
        </section>

        <section>
          <h2>2. National signals by illness group</h2>
          <table>
            <thead><tr><th>Group</th><th>This week</th><th>Expected</th><th>Last 4 weeks</th><th>Unfilled</th><th>Status</th></tr></thead>
            <tbody>
              {L.signals.map((s) => (
                <tr key={s.group}>
                  <td><b>{s.label}</b></td>
                  <td>{s.count == null ? `<${data.thresholds.smallCell}` : s.count}</td>
                  <td>{s.expected}</td>
                  <td>{s.last4 == null ? `<${data.thresholds.smallCell}` : s.last4}</td>
                  <td>{s.count ? pct(s.unfilledShare) : '–'}</td>
                  <td><span className={`pb-tag ${s.level}`}>{s.level === 'alert' ? 'Alert' : s.level === 'watch' ? 'Watch' : 'Normal'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <div className="pb-two">
          <section>
            <h2>3. Most-wanted, hardest to find</h2>
            <table>
              <thead><tr><th>Medicine</th><th>Group</th><th>Unfilled searches (13 wks)</th></tr></thead>
              <tbody>
                {L.topUnmet.slice(0, 10).map((u) => (
                  <tr key={u.name}><td className="cap">{u.name}</td><td>{groupsById[u.group]?.label || 'Other'}</td><td>{u.searches}</td></tr>
                ))}
              </tbody>
            </table>
          </section>
          <section>
            <h2>4. Activity and stock cover by town</h2>
            <table>
              <thead><tr><th>Town</th><th>Searches (4 wks)</th><th>Pharmacies</th><th>Thin cover</th></tr></thead>
              <tbody>
                {data.towns.filter((t) => (L.townStatus[t.id]?.searches4 ?? 1) > 0 || L.stockByTown.some((s) => s.town === t.id)).map((t) => {
                  const st = L.stockByTown.find((s) => s.town === t.id);
                  const s4 = L.townStatus[t.id]?.searches4;
                  return (
                    <tr key={t.id}>
                      <td><b>{t.name}</b></td>
                      <td>{s4 == null ? `<${data.thresholds.smallCell}` : s4}</td>
                      <td>{st?.pharmacies ?? '–'}</td>
                      <td className="pb-muted">{st ? (st.gaps.length ? st.gaps.map((g) => groupsById[g]?.label).join(', ') : 'None') : '–'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        </div>

        <section className="pb-method">
          <h2>5. Method, data quality and privacy</h2>
          <ul>
            <li><b>Sources:</b> ChekaMeds medicine searches (WhatsApp and web), live pharmacy stock listings ({L.totals.stockListings.toLocaleString()}), and {data.weather.source === 'open-meteo' ? 'Open-Meteo daily temperature and rainfall per town' : 'Botswana seasonal weather normals'}.</li>
            <li><b>Method:</b> searches are cleaned (adverts, tests and repeat searches by the same person removed), grouped into illness and supply signals and compared with each place's previous 6 weeks. Unfilled searches and weather anomalies can strengthen a rise but never create an alert alone.</li>
            <li><b>Coverage:</b> {pct(L.totals.locatedShare)} of searches are placed in a town. Areas with few searches are not scored, so absence of a signal is not evidence of absence of disease.</li>
            <li><b>Privacy:</b> aggregated counts only; counts below {data.thresholds.smallCell} suppressed; sexual and reproductive health searches counted but not named; no personal data in this bulletin.</li>
            <li><b>Data file:</b> the CSV uses the DHIS2 data value set layout (dataElement, period {isoWeek(data.week)}, orgUnit). Data element and org-unit codes are mapped to national codes on import.</li>
          </ul>
          <p className="pb-muted">ChekaMeds Pulse · IBLIM Enterprises (Pty) Ltd · info@chekameds.co.bw · chekameds.co.bw/pulse</p>
        </section>
      </main>
    </div>
  );
}

const CSS = `
.pb{background:#eef0f3;min-height:100vh;color:#1b1f2a;font-family:Inter,system-ui,sans-serif}
.pb-bar{position:sticky;top:0;z-index:5;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;padding:12px 20px;background:#141a33;color:#fff}
.pb-bar a{color:#fff;text-decoration:none;font-size:.92rem}
.pb-bar button{margin-left:8px;padding:9px 14px;border-radius:999px;border:1px solid rgba(255,255,255,.35);background:transparent;color:#fff;font:500 .88rem Inter,system-ui,sans-serif;cursor:pointer}
.pb-bar button.primary{background:#e8b10b;border-color:#e8b10b;color:#141a33}
.pb-page{max-width:1000px;margin:24px auto;background:#fff;padding:40px 44px;border-radius:6px;box-shadow:0 2px 14px rgba(20,26,51,.08)}
.pb-head{background:#fff!important;display:flex;justify-content:space-between;gap:24px;align-items:flex-start;border-bottom:2px solid #141a33;padding-bottom:16px;margin-bottom:18px;flex-wrap:wrap}
.pb-kicker{margin:0;color:#8a6a00;font-weight:600;font-size:.82rem;letter-spacing:.03em;text-transform:uppercase}
.pb h1{font-size:1.9rem;margin:6px 0 4px;color:#141a33;font-weight:650}
.pb h2{font-size:1.05rem;margin:22px 0 8px;color:#141a33;font-weight:650}
.pb-for{max-width:300px;font-size:.84rem;color:#4a5263;background:#f5f6f8;padding:10px 12px;border-radius:6px}
.pb-muted{color:#5d6576}
.pb-kpis{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px}
.pb-kpis div{border:1px solid #e1e4ea;border-radius:6px;padding:10px 12px;display:grid}
.pb-kpis b{font-size:1.5rem;color:#141a33}
.pb-kpis b.red{color:#c24141}.pb-kpis b.amber{color:#b5790e}
.pb-kpis span{font-size:.76rem;color:#5d6576}
.pb table{width:100%;border-collapse:collapse;font-size:.84rem}
.pb th{text-align:left;background:#f5f6f8;color:#3a4152;font-weight:600;padding:7px 8px;border-bottom:1px solid #d9dde5}
.pb td{padding:7px 8px;border-bottom:1px solid #eceef2;vertical-align:top;color:#1b1f2a!important;background:#fff!important}
.pb th{background:#f5f6f8!important;color:#3a4152!important}
.pb section{overflow-x:auto}
.pb .cap{text-transform:capitalize}
.pb-tag{display:inline-block;font-size:.72rem;font-weight:650;padding:3px 8px;border-radius:999px;white-space:nowrap}
.pb-tag.alert{background:#fde8e8;color:#b13434}.pb-tag.watch{background:#fdf1dc;color:#996407}.pb-tag.none{background:#e3f4ec;color:#1f7a50}
.pb-note{font-size:.78rem;color:#5d6576;margin:6px 0 0}
.pb-two{display:grid;grid-template-columns:1fr 1fr;gap:22px}
.pb-method ul{margin:0;padding-left:18px;font-size:.84rem;line-height:1.55;color:#2c3242;display:grid;gap:4px}
.pb-method > p{font-size:.78rem;margin-top:14px}
@media (max-width:760px){.pb-bar button{margin:6px 6px 0 0}.pb-page{padding:22px 16px;margin:0;border-radius:0}.pb table{min-width:520px}.pb-kpis{grid-template-columns:repeat(2,1fr)}.pb-two{grid-template-columns:1fr}.pb table{font-size:.78rem}}
@media print{
  @page{size:A4;margin:12mm}
  .no-print{display:none!important}
  .pb{background:#fff}
  .pb-page{box-shadow:none;margin:0;padding:0;max-width:none}
  .pb tr{break-inside:avoid}
  .pb section{overflow:visible}
  .pb h2{break-after:avoid}
}
`;
