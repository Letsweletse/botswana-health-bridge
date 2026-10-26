import { useMemo, useState } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

/* ChekaMeds monthly market report – glass night.
   Used by the public signed report page (/report) and the pharmacy dashboard (Market insights). */

export type ReportData = {
  clinic: string; month: string; monthLabel: string; partial: boolean; daysCovered: number; prevMonthLabel: string;
  town: string | null; townName: string | null; generatedAt: string;
  headline: { townSearches: number; townSearchesChange: number | null; yourSearches: number; yourSearchesChange: number | null; yourSearchesNational: number; coverage: number; uniqueSearchers: number; returningShare: number; notFound: number; notFoundShare: number; orders: number; nationalSearches: number; locatedShare: number };
  shelf: { listings: number; inStock: number; inStockShare: number; lastUpdate: string | null; staleDays: number | null; pharmaciesInTown: number };
  daily: { day: number; searches: number; yours: number }[];
  heat: number[][]; peakDay: string | null; peakHour: number | null; afterHoursShare: number;
  channels: { name: string; n: number }[]; areas: { name: string; n: number }[]; towns: { name: string; n: number; you: boolean }[];
  categories: { name: string; n: number; change: number | null; unnamed: boolean }[];
  medicines: { rank: number; name: string; searches: number; change: number | null; unfilledShare: number; youList: boolean; youInStock: boolean; pharmaciesInTown: number; yourPrice: number | null; townMedian: number | null }[];
  rising: { name: string; n: number; p: number }[]; missed: { name: string; searches: number; notFound: number }[]; restock: { name: string; searches: number }[];
  signals: { label: string; level: string; place: string; action: string }[];
  national?: boolean;
  network?: { pharmacies: number; listings: number; inStockShare: number; freshShare: number; uniqueSearchers: number; returningShare: number; underserved: string[];
    towns: { name: string; searches: number; change: number | null; notFoundShare: number; pharmacies: number; listings: number; inStockShare: number; freshShare: number; perPharmacy: number | null }[] } | null;
};

// Validated categorical steps for the dark surface (dataviz validator: all six checks pass).
const C = { gold: '#b88600', teal: '#1f9e93', violet: '#7d6cf2', pink: '#d6408a' };
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const fmtH = (h: number) => `${String(h).padStart(2, '0')}:00`;
const n = (x: number) => x.toLocaleString('en-GB');

function Delta({ v, vs }: { v: number | null; vs?: string }) {
  if (v == null) return <span className="gn-delta flat">new this month</span>;
  const cls = v > 2 ? 'up' : v < -2 ? 'down' : 'flat';
  return <span className={`gn-delta ${cls}`}>{v > 0 ? '▲' : v < 0 ? '▼' : '•'} {Math.abs(v)}%{vs ? ` vs ${vs}` : ''}</span>;
}

function Bars({ rows, color = C.teal, highlight }: { rows: { name: string; n: number; you?: boolean }[]; color?: string; highlight?: boolean }) {
  const max = Math.max(1, ...rows.map((r) => r.n));
  return (
    <div className="gn-bars">
      {rows.map((r) => (
        <div key={r.name} className={`gn-bar ${highlight && r.you ? 'you' : ''}`} title={`${r.name}: ${n(r.n)} searches`}>
          <span className="lbl">{r.name}{highlight && r.you ? ' · you' : ''}</span>
          <span className="track"><i style={{ width: `${(r.n / max) * 100}%`, background: highlight && r.you ? C.gold : color }} /></span>
          <b>{n(r.n)}</b>
        </div>
      ))}
    </div>
  );
}

function Heat({ heat }: { heat: number[][] }) {
  const max = Math.max(1, ...heat.flat());
  const [tip, setTip] = useState<string | null>(null);
  return (
    <div className="gn-heat">
      <div className="grid" onMouseLeave={() => setTip(null)}>
        <span />
        {Array.from({ length: 24 }, (_, h) => <span key={h} className="hl">{h % 3 === 0 ? h : ''}</span>)}
        {heat.map((row, d) => (
          <div key={d} className="row">
            <span className="dl">{DAYS[d]}</span>
            {row.map((v, h) => (
              <span key={h} className="cell" onMouseEnter={() => setTip(`${DAYS[d]} ${fmtH(h)}–${fmtH((h + 1) % 24)}: ${v} search${v === 1 ? '' : 'es'}`)}
                style={{ background: v ? `rgba(31,158,147,${0.12 + 0.88 * (v / max)})` : 'rgba(255,255,255,.035)' }} />
            ))}
          </div>
        ))}
      </div>
      <p className="gn-tip">{tip || 'Hover a square to see the count. Brighter means more searches.'}</p>
    </div>
  );
}

export default function PharmacyReport({ data, months, onMonth, compact }: { data: ReportData; months?: { value: string; label: string }[]; onMonth?: (m: string) => void; compact?: boolean }) {
  const h = data.headline;
  const nat = !!data.national; const net = data.network;
  const place = data.townName ? `in ${data.townName}` : 'across Botswana';
  const chChannels = useMemo(() => {
    const total = Math.max(1, data.channels.reduce((a, c) => a + c.n, 0));
    return data.channels.map((c, i) => ({ ...c, pct: Math.round((c.n / total) * 100), color: [C.teal, C.violet, C.gold, C.pink][i % 4] }));
  }, [data.channels]);
  const daily = data.daily.map((d) => ({ ...d, label: `${d.day}` }));

  return (
    <div className={`gn ${compact ? 'compact' : ''}`}>
      <style>{CSS}</style>
      <div className="gn-aurora" aria-hidden="true"><i /><i /><i /></div>

      <div className="gn-hero">
        <div>
          <p className="gn-kicker">{nat ? 'ChekaMeds Pulse · national monthly bulletin' : 'ChekaMeds market report'}</p>
          <h1>{nat ? 'Medicine demand in Botswana' : data.clinic}</h1>
          <p className="gn-sub">{data.monthLabel}{data.partial ? ` · first ${data.daysCovered} days` : ''}{data.townName ? ` · ${data.townName}` : ''} · compared with {data.prevMonthLabel}</p>
        </div>
        {months && onMonth && (
          <label className="gn-month">Month
            <select value={data.month} onChange={(e) => onMonth(e.target.value)}>{months.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}</select>
          </label>
        )}
      </div>

      <section className="gn-kpis">
        <div className="gn-glass kpi hero"><span>Medicine searches {place}</span><b>{n(h.townSearches)}</b><Delta v={h.townSearchesChange} vs={data.prevMonthLabel} /></div>
        {nat && net ? (<>
          <div className="gn-glass kpi"><span>Pharmacies sharing stock</span><b>{n(net.pharmacies)}</b><em>{n(net.listings)} medicine listings shared</em></div>
          <div className="gn-glass kpi"><span>Stock kept fresh</span><b>{net.freshShare}%</b><em>of pharmacies updated in the last 14 days</em></div>
        </>) : (<>
          <div className="gn-glass kpi"><span>Searches for medicines you list</span><b>{n(h.yourSearches)}</b><Delta v={h.yourSearchesChange} /><em>{n(h.yourSearchesNational)} across Botswana</em></div>
          <div className="gn-glass kpi"><span>Your shelf match</span><b>{h.coverage}%</b><em>of searches {place} were for something you list</em></div>
        </>)}
        <div className="gn-glass kpi"><span>People searching</span><b>{n(h.uniqueSearchers)}</b><em>{h.returningShare}% came back from earlier months</em></div>
        <div className="gn-glass kpi warn"><span>Searches that found nothing</span><b>{n(h.notFound)}</b><em>{h.notFoundShare}% of searches {place}: demand nobody met</em></div>
        <div className="gn-glass kpi"><span>{nat ? 'Orders and reservations nationally' : 'Orders and reservations'}</span><b>{n(h.orders)}</b><em>through ChekaMeds</em></div>
      </section>

      <section className="gn-glass gn-card">
        <div className="gn-card-h"><h2>Demand day by day</h2><div className="gn-legend"><span><i style={{ background: C.teal }} />All searches {place}</span>{!nat && <span><i style={{ background: C.gold }} />For medicines you list</span>}</div></div>
        <div style={{ height: 240 }}>
          <ResponsiveContainer>
            <AreaChart data={daily} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
              <defs>
                <linearGradient id="gnA" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.teal} stopOpacity={0.45} /><stop offset="100%" stopColor={C.teal} stopOpacity={0} /></linearGradient>
                <linearGradient id="gnB" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.gold} stopOpacity={0.5} /><stop offset="100%" stopColor={C.gold} stopOpacity={0} /></linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,.06)" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: 'rgba(255,255,255,.5)', fontSize: 11 }} axisLine={false} tickLine={false} interval={Math.ceil(daily.length / 10)} />
              <YAxis tick={{ fill: 'rgba(255,255,255,.5)', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ background: 'rgba(14,16,38,.92)', border: '1px solid rgba(255,255,255,.14)', borderRadius: 12, color: '#fff' }} labelFormatter={(l) => `${data.monthLabel.split(' ')[0]} ${l}`} formatter={(v: number, k: string) => [v, k === 'searches' ? `All searches ${place}` : 'For your medicines']} cursor={{ stroke: 'rgba(255,255,255,.25)' }} />
              <Area type="monotone" dataKey="searches" stroke={C.teal} strokeWidth={2} fill="url(#gnA)" />
              {!nat && <Area type="monotone" dataKey="yours" stroke={C.gold} strokeWidth={2} fill="url(#gnB)" />}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      {nat && net && (
        <section className="gn-glass gn-card">
          <div className="gn-card-h"><h2>Town by town</h2><span className="gn-muted">Searches placed in a town · pharmacies sharing stock there</span></div>
          <div className="gn-table-wrap">
            <table className="gn-table">
              <thead><tr><th>Town</th><th>Searches</th><th>Change</th><th>Found nothing</th><th>Pharmacies</th><th>Searches per pharmacy</th><th>Medicine listings</th><th>Stock fresh</th></tr></thead>
              <tbody>{net.towns.map((t) => (
                <tr key={t.name}><td><b>{t.name}</b></td><td>{n(t.searches)}</td><td><Delta v={t.change} /></td>
                  <td className={t.notFoundShare >= 35 ? 'gn-hi' : ''}>{t.notFoundShare}%</td><td>{t.pharmacies}</td><td>{t.perPharmacy ?? '–'}</td>
                  <td>{t.listings ? n(t.listings) : '–'}</td><td className={t.pharmacies && t.freshShare < 50 ? 'gn-hi' : ''}>{t.pharmacies ? `${t.freshShare}%` : '–'}</td></tr>
              ))}</tbody>
            </table>
          </div>
          {net.underserved.length > 0 && <p className="gn-nudge" style={{ marginTop: 14 }}>Underserved this month: <b>{net.underserved.join(', ')}</b>, with real demand but few pharmacies sharing stock or many searches finding nothing. These are the best places to recruit pharmacies and check supply.</p>}
        </section>
      )}

      <section className="gn-two">
        <div className="gn-glass gn-card">
          <div className="gn-card-h"><h2>When people search</h2></div>
          <div className="gn-callouts">
            {data.peakDay && <div><b>{data.peakDay}</b><span>busiest day</span></div>}
            {data.peakHour != null && <div><b>{fmtH(data.peakHour)}</b><span>busiest hour</span></div>}
            <div><b>{data.afterHoursShare}%</b><span>outside 08:00–18:00</span></div>
          </div>
          <Heat heat={data.heat} />
        </div>
        <div className="gn-glass gn-card">
          <div className="gn-card-h"><h2>How they search</h2></div>
          <div className="gn-stack" role="img" aria-label={chChannels.map((c) => `${c.name} ${c.pct}%`).join(', ')}>
            {chChannels.map((c) => <i key={c.name} style={{ width: `${c.pct}%`, background: c.color }} title={`${c.name}: ${c.pct}%`} />)}
          </div>
          <div className="gn-legend col">{chChannels.map((c) => <span key={c.name}><i style={{ background: c.color }} />{c.name}<b>{c.pct}%</b><em>{n(c.n)}</em></span>)}</div>
          <div className="gn-ring-row">
            <div className="gn-ring" style={{ ['--p' as any]: h.returningShare }}><b>{h.returningShare}%</b></div>
            <p><b>Returning searchers.</b> {h.returningShare}% of the {n(h.uniqueSearchers)} people searching {place} had used ChekaMeds before this month. The rest found it for the first time.</p>
          </div>
        </div>
      </section>

      <section className="gn-two">
        <div className="gn-glass gn-card">
          <div className="gn-card-h"><h2>{nat ? 'Busiest towns' : data.areas.length ? `Where in ${data.townName} people search` : 'Where people search'}</h2></div>
          {!nat && (data.areas.length ? <Bars rows={data.areas} color={C.violet} /> : <p className="gn-muted">Not enough searches named a neighbourhood this month.</p>)}
          {!nat && <h3>Busiest towns in Botswana</h3>}
          <Bars rows={data.towns} highlight />
        </div>
        <div className="gn-glass gn-card">
          <div className="gn-card-h"><h2>What people need</h2></div>
          <div className="gn-cats">
            {data.categories.map((c) => (
              <div key={c.name}><span>{c.name}{c.unnamed ? ' *' : ''}</span><b>{n(c.n)}</b><Delta v={c.change} /></div>
            ))}
          </div>
          {data.categories.some((c) => c.unnamed) && <p className="gn-fine">* Counted, but individual medicines in this category are never named.</p>}
        </div>
      </section>

      <section className="gn-glass gn-card">
        <div className="gn-card-h"><h2>Top medicines searched {place}{nat ? '' : ', and your shelf'}</h2><span className="gn-muted">Most searched first · medicines with fewer than 3 searches are not shown</span></div>
        <div className="gn-table-wrap">
          <table className="gn-table">
            <thead><tr><th>#</th><th>Medicine</th><th>Searches</th><th>Change</th><th>Not found</th>{!nat && <th>Your shelf</th>}<th>Pharmacies {data.townName ? `in ${data.townName}` : ''} with it in stock</th><th>{nat ? 'Typical price' : 'Your price vs town'}</th></tr></thead>
            <tbody>
              {data.medicines.map((m) => (
                <tr key={m.rank}>
                  <td className="rk">{m.rank}</td>
                  <td><b>{m.name}</b></td>
                  <td>{m.searches}</td>
                  <td><Delta v={m.change} /></td>
                  <td>{m.unfilledShare}%</td>
                  {!nat && <td><span className={`gn-chip ${m.youInStock ? 'ok' : m.youList ? 'out' : 'no'}`}>{m.youInStock ? 'In stock' : m.youList ? 'Out of stock' : 'Not listed'}</span></td>}
                  <td className={nat && m.pharmaciesInTown <= 2 ? 'gn-hi' : ''}>{m.pharmaciesInTown}</td>
                  <td>{nat ? (m.townMedian != null ? `P${m.townMedian.toFixed(2)}` : <span className="gn-muted">–</span>) : m.yourPrice != null && m.townMedian != null ? <span className={m.yourPrice > m.townMedian * 1.1 ? 'gn-hi' : m.yourPrice < m.townMedian * 0.9 ? 'gn-lo' : ''}>P{m.yourPrice.toFixed(2)} vs P{m.townMedian.toFixed(2)}</span> : <span className="gn-muted">–</span>}</td>
                </tr>
              ))}
              {data.medicines.length === 0 && <tr><td colSpan={8} className="gn-muted">Not enough searches {place} yet this month.</td></tr>}
            </tbody>
          </table>
        </div>
        {nat ? <p className="gn-fine">"Typical price" is the middle of the lowest prices listed by each pharmacy, shown when at least 3 pharmacies list one. Pharmacies are never named.</p> : <p className="gn-fine">"Your price vs town" compares your lowest listed price with the middle price of other pharmacies {place}, shown only when at least 3 of them list a price. Other pharmacies are never named.</p>}
      </section>

      <section className={nat ? 'gn-two' : 'gn-three'}>
        <div className="gn-glass gn-card opp">
          <h2>{nat ? 'Unmet demand' : 'Add to your shelf'}</h2><p className="gn-muted">{nat ? `Searched ${place} and found at no pharmacy on ChekaMeds.` : `Searched ${place}, found nowhere, and not on your list.`}</p>
          <ol>{data.missed.map((m) => <li key={m.name}><span>{m.name}</span><b>{m.notFound}</b></li>)}</ol>
          {data.missed.length === 0 && <p className="gn-muted">Nothing missing this month. 🎉</p>}
        </div>
        {!nat && <div className="gn-glass gn-card opp">
          <h2>Restock</h2><p className="gn-muted">You list these, but they show as out of stock while people search for them.</p>
          <ol>{data.restock.map((m) => <li key={m.name}><span>{m.name}</span><b>{m.searches}</b></li>)}</ol>
          {data.restock.length === 0 && <p className="gn-muted">Everything people searched for that you list is in stock.</p>}
        </div>}
        <div className="gn-glass gn-card opp">
          <h2>Rising fast</h2><p className="gn-muted">Searches up sharply on {data.prevMonthLabel}.</p>
          <ol>{data.rising.map((m) => <li key={m.name}><span>{m.name}</span><b>{m.p} → {m.n}</b></li>)}</ol>
          {data.rising.length === 0 && <p className="gn-muted">No sharp rises this month.</p>}
        </div>
      </section>

      <section className="gn-two">
        <div className="gn-glass gn-card">
          <div className="gn-card-h"><h2>Health signals {place}</h2><span className="gn-muted">from ChekaMeds Pulse</span></div>
          {data.signals.length ? data.signals.map((s, i) => (
            <div key={i} className={`gn-signal ${s.level}`}><b>{s.label} · {s.place}</b><span>{s.action}</span></div>
          )) : <p className="gn-muted">No unusual health signals right now.</p>}
        </div>
        {nat && net ? (
          <div className="gn-glass gn-card">
            <div className="gn-card-h"><h2>The ChekaMeds network</h2></div>
            <div className="gn-callouts">
              <div><b>{n(net.pharmacies)}</b><span>pharmacies sharing stock</span></div>
              <div><b>{n(net.listings)}</b><span>medicine listings</span></div>
              <div className={net.freshShare < 50 ? 'bad' : ''}><b>{net.freshShare}%</b><span>updated in 14 days</span></div>
            </div>
            <p className="gn-muted">{n(net.uniqueSearchers)} people searched in {data.monthLabel}; {net.returningShare}% had used ChekaMeds before.</p>
          </div>
        ) : (
        <div className="gn-glass gn-card">
          <div className="gn-card-h"><h2>Your listing</h2></div>
          <div className="gn-callouts">
            <div><b>{n(data.shelf.listings)}</b><span>items listed</span></div>
            <div><b>{data.shelf.inStockShare}%</b><span>in stock</span></div>
            <div className={data.shelf.staleDays != null && data.shelf.staleDays > 14 ? 'bad' : ''}><b>{data.shelf.staleDays == null ? '–' : data.shelf.staleDays === 0 ? 'Today' : `${data.shelf.staleDays} days`}</b><span>since last update</span></div>
            <div><b>{data.shelf.pharmaciesInTown}</b><span>pharmacies listed {place}</span></div>
          </div>
          {(data.shelf.staleDays ?? 99) > 14 && <p className="gn-nudge">Your stock is more than two weeks old. Pharmacies with fresh stock appear first and convert more searches.</p>}
          {!compact && <a className="gn-cta" href="/dashboard">Update your stock</a>}
        </div>
        )}
      </section>

      <div className="gn-foot">
        Based on {n(h.nationalSearches)} cleaned medicine searches on ChekaMeds (WhatsApp and web) in {data.monthLabel}; {h.locatedShare}% of them could be placed in a town. Adverts, greetings and repeat searches by the same person on the same day are removed.
        ChekaMeds does not collect age or gender, and this report contains no names, phone numbers or individual searches. © IBLIM Enterprises (Pty) Ltd.
      </div>
    </div>
  );
}

const CSS = `
.gn{position:relative;isolation:isolate;overflow:hidden;color:#eef0ff;font-family:Inter,system-ui,sans-serif;background:radial-gradient(1200px 700px at 10% -10%,#1b1f4d 0%,transparent 60%),radial-gradient(900px 600px at 110% 10%,#1a3a4a 0%,transparent 55%),linear-gradient(180deg,#05060f 0%,#0a0d24 55%,#05060f 100%);padding:clamp(18px,4vw,48px);border-radius:0}
.gn.compact{border-radius:22px}
.gn-aurora{position:absolute;inset:0;z-index:-1;pointer-events:none}
.gn-aurora i{position:absolute;border-radius:50%;filter:blur(90px);opacity:.35}
.gn-aurora i:nth-child(1){width:480px;height:480px;background:#7d6cf2;top:-160px;left:-120px}
.gn-aurora i:nth-child(2){width:420px;height:420px;background:#1f9e93;top:30%;right:-160px;opacity:.25}
.gn-aurora i:nth-child(3){width:380px;height:380px;background:#b88600;bottom:-180px;left:30%;opacity:.18}
.gn-glass{background:linear-gradient(160deg,rgba(255,255,255,.085),rgba(255,255,255,.03));border:1px solid rgba(255,255,255,.12);box-shadow:inset 0 1px 0 rgba(255,255,255,.12),0 20px 50px -24px rgba(0,0,0,.7);backdrop-filter:blur(18px) saturate(140%);-webkit-backdrop-filter:blur(18px) saturate(140%);border-radius:22px}
.gn-hero{display:flex;justify-content:space-between;align-items:flex-end;gap:18px;flex-wrap:wrap;margin-bottom:22px}
.gn-kicker{margin:0;color:#e8b10b;font-weight:650;font-size:.76rem;letter-spacing:.14em;text-transform:uppercase}
.gn h1{margin:8px 0 6px;font-size:clamp(1.7rem,4vw,2.6rem);font-weight:600;letter-spacing:-.02em;background:linear-gradient(90deg,#fff,#c9cdfc);-webkit-background-clip:text;background-clip:text;color:transparent}
.gn-sub{margin:0;color:rgba(238,240,255,.62);font-size:.95rem}
.gn-month{display:grid;gap:6px;font-size:.78rem;color:rgba(238,240,255,.6)}
.gn-month select{background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.18);border-radius:12px;color:#fff;padding:10px 14px;font:inherit}
.gn-month select option{color:#000}
.gn-kpis{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}
.gn .kpi{padding:18px 20px;display:grid;gap:4px;align-content:start}
.gn .kpi span{font-size:.8rem;color:rgba(238,240,255,.6)}
.gn .kpi b{font-size:2.1rem;font-weight:620;letter-spacing:-.02em;line-height:1.1}
.gn .kpi em{font-style:normal;font-size:.78rem;color:rgba(238,240,255,.55)}
.gn .kpi.hero{background:linear-gradient(150deg,rgba(125,108,242,.28),rgba(31,158,147,.12));border-color:rgba(160,150,255,.3)}
.gn .kpi.warn b{color:#fda4af}
.gn-delta{font-size:.76rem;font-weight:600}.gn-delta.up{color:#5eeaa8}.gn-delta.down{color:#fda4af}.gn-delta.flat{color:rgba(238,240,255,.5)}
.gn-card{padding:20px;margin-top:14px;min-width:0}
.gn-card-h{display:flex;justify-content:space-between;align-items:baseline;gap:12px;flex-wrap:wrap;margin-bottom:12px}
.gn h2{margin:0;font-size:1.05rem;font-weight:600}
.gn h3{margin:18px 0 8px;font-size:.86rem;font-weight:600;color:rgba(238,240,255,.75)}
.gn-muted{color:rgba(238,240,255,.55);font-size:.82rem;margin:0}
.gn-fine{color:rgba(238,240,255,.45);font-size:.74rem;margin:10px 0 0}
.gn-legend{display:flex;gap:14px;flex-wrap:wrap;font-size:.78rem;color:rgba(238,240,255,.7)}
.gn-legend span{display:inline-flex;align-items:center;gap:6px}.gn-legend i{width:10px;height:10px;border-radius:3px;display:inline-block}
.gn-legend.col{display:grid;gap:8px;margin-top:12px}.gn-legend.col span{display:grid;grid-template-columns:12px 1fr auto auto;gap:8px}.gn-legend.col b{color:#fff}.gn-legend.col em{font-style:normal;color:rgba(238,240,255,.45);min-width:44px;text-align:right}
.gn-two{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
.gn-three{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}
.gn-callouts{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px}
.gn-callouts div{flex:1 1 110px;padding:12px 14px;border-radius:14px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);display:grid;gap:2px}
.gn-callouts b{font-size:1.25rem}.gn-callouts span{font-size:.74rem;color:rgba(238,240,255,.55)}.gn-callouts .bad b{color:#fda4af}
.gn-heat .grid{display:grid;grid-template-columns:34px repeat(24,minmax(0,1fr));gap:2px;font-size:.62rem;color:rgba(238,240,255,.45)}
.gn-heat .row{display:contents}.gn-heat .hl{text-align:left}.gn-heat .dl{align-self:center}
.gn-heat .cell{aspect-ratio:1;border-radius:3px;min-height:9px;cursor:default}
.gn-tip{margin:8px 0 0;font-size:.74rem;color:rgba(238,240,255,.55);min-height:1.2em}
.gn-stack{display:flex;gap:2px;height:14px;border-radius:999px;overflow:hidden;background:rgba(255,255,255,.05)}.gn-stack i{display:block;height:100%}
.gn-ring-row{display:flex;gap:14px;align-items:center;margin-top:18px}
.gn-ring{--p:0;flex:0 0 84px;height:84px;border-radius:50%;display:grid;place-items:center;background:conic-gradient(#7d6cf2 calc(var(--p)*1%),rgba(255,255,255,.08) 0)}
.gn-ring::before{content:'';position:absolute}
.gn-ring b{width:64px;height:64px;border-radius:50%;background:#0b0e26;display:grid;place-items:center;font-size:1rem}
.gn-ring-row p{margin:0;font-size:.84rem;color:rgba(238,240,255,.7);line-height:1.45}.gn-ring-row p b{color:#fff}
.gn-bars{display:grid;gap:8px}
.gn-bar{display:grid;grid-template-columns:minmax(90px,140px) 1fr 52px;gap:10px;align-items:center;font-size:.82rem}
.gn-bar .lbl{color:rgba(238,240,255,.78);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gn-bar .track{height:10px;border-radius:999px;background:rgba(255,255,255,.06);overflow:hidden}.gn-bar .track i{display:block;height:100%;border-radius:999px}
.gn-bar b{text-align:right;font-weight:600}.gn-bar.you .lbl{color:#f5d36b;font-weight:600}
.gn-cats{display:grid;gap:8px}
.gn-cats div{display:grid;grid-template-columns:1fr auto 120px;gap:10px;align-items:center;padding:10px 12px;border-radius:12px;background:rgba(255,255,255,.04);font-size:.86rem}
.gn-cats div .gn-delta{text-align:right}
.gn-table-wrap{overflow-x:auto}
.gn-table{width:100%;border-collapse:collapse;font-size:.86rem;min-width:820px}
.gn-table th{text-align:left;font-weight:500;font-size:.74rem;color:rgba(238,240,255,.5);padding:8px 10px;border-bottom:1px solid rgba(255,255,255,.1)}
.gn-table td{padding:10px;border-bottom:1px solid rgba(255,255,255,.06)}
.gn-table tr:hover td{background:rgba(255,255,255,.03)}
.gn-table .rk{color:rgba(238,240,255,.4);width:28px}
.gn-chip{font-size:.72rem;font-weight:650;padding:4px 9px;border-radius:999px;white-space:nowrap}
.gn-chip.ok{background:rgba(94,234,168,.14);color:#86efac}.gn-chip.out{background:rgba(253,164,175,.14);color:#fda4af}.gn-chip.no{background:rgba(255,255,255,.07);color:rgba(238,240,255,.65)}
.gn-hi{color:#fda4af}.gn-lo{color:#86efac}
.gn .opp ol{list-style:none;padding:0;margin:12px 0 0;display:grid;gap:6px;counter-reset:o}
.gn .opp li{display:flex;justify-content:space-between;gap:10px;padding:9px 12px;border-radius:12px;background:rgba(255,255,255,.045);font-size:.86rem}
.gn .opp li b{color:#f5d36b}
.gn-signal{display:grid;gap:4px;padding:12px 14px;border-radius:14px;margin-top:8px;background:rgba(255,255,255,.04);border-left:3px solid #fbbf5a;font-size:.84rem}
.gn-signal.alert{border-left-color:#f87171}.gn-signal span{color:rgba(238,240,255,.65)}
.gn-nudge{margin:4px 0 0;padding:12px 14px;border-radius:14px;background:rgba(232,177,11,.12);border:1px solid rgba(232,177,11,.3);font-size:.84rem}
.gn-cta{display:inline-flex;margin-top:14px;padding:12px 18px;border-radius:999px;background:linear-gradient(90deg,#e8b10b,#f5d36b);color:#141a33;font-weight:650;font-size:.9rem;text-decoration:none}
.gn-foot{margin-top:22px;font-size:.74rem;line-height:1.55;color:rgba(238,240,255,.45);max-width:900px}
@media (max-width:980px){.gn-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.gn-two,.gn-three{grid-template-columns:1fr}}
@media (max-width:520px){.gn .kpi b{font-size:1.6rem}.gn-cats div{grid-template-columns:1fr auto}.gn-cats div .gn-delta{grid-column:1/-1;text-align:left}.gn-bar{grid-template-columns:90px 1fr 40px}}
@media print{.gn{background:#0a0d24;-webkit-print-color-adjust:exact;print-color-adjust:exact}.gn-month{display:none}}
`;
