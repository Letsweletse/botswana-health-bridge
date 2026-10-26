import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { C, CSS, Delta, Bars, Heat, fmtH, fmtN as n } from './PharmacyReport';

/* ChekaMeds business engagement report (glass night): one report for a whole pharmacy business. */

export type BusinessData = {
  business: string; month: string; monthLabel: string; partial: boolean; daysCovered: number; prevMonthLabel: string; generatedAt: string;
  headline: { branches: number; listings: number; towns: number; shown: number; shownChange: number | null; people: number; shareOfVoice: number; nationalSearches: number; trackedSearches: number; taps: number; reserves: number; orders: number; lost: number; unmet: number; staleBranches: number; lastUpdateDays: number | null };
  league: { branch: string; town: string; shown: number; change: number | null; taps: number; reserves: number; listings: number; staleDays: number | null }[];
  daily: { day: number; label: string; searches: number; yours: number }[];
  heat: number[][]; peakDay: string | null; peakHour: number | null;
  origins: { name: string; n: number }[];
  drivers: { name: string; searches: number; branchesStocking: number; yourPrice: number | null; marketPrice: number | null; competitors: number }[];
  lostTop: { name: string; searches: number }[]; unmetTop: { name: string; searches: number }[];
  signals: { label: string; level: string; place: string; action: string }[]; recs: string[];
};

export default function BusinessReport({ data, months, onMonth }: { data: BusinessData; months?: { value: string; label: string }[]; onMonth?: (m: string) => void }) {
  const h = data.headline;
  const maxShown = Math.max(1, ...data.league.map((b) => b.shown));
  return (
    <div className="gn">
      <style>{CSS + EXTRA}</style>
      <div className="gn-aurora" aria-hidden="true"><i /><i /><i /></div>

      <div className="gn-hero">
        <div>
          <p className="gn-kicker">ChekaMeds · business engagement report</p>
          <h1>{data.business}</h1>
          <p className="gn-sub">{data.monthLabel}{data.partial ? ` · first ${data.daysCovered} days` : ''} · {h.branches} branches in {h.towns} towns · {n(h.listings)} medicines listed · compared with {data.prevMonthLabel}</p>
        </div>
        {months && onMonth && (
          <label className="gn-month">Month
            <select value={data.month} onChange={(e) => onMonth(e.target.value)}>{months.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}</select>
          </label>
        )}
      </div>

      <section className="gn-kpis">
        <div className="gn-glass kpi hero"><span>Times your branches appeared in search results</span><b>{n(h.shown)}</b><Delta v={h.shownChange} vs={data.prevMonthLabel} /></div>
        <div className="gn-glass kpi"><span>Share of searches that showed you</span><b>{h.shareOfVoice}%</b><em>of {n(h.trackedSearches)} searches with results logged on ChekaMeds</em></div>
        <div className="gn-glass kpi"><span>People who saw your branches</span><b>{n(h.people)}</b><em>different phone numbers, counted privately</em></div>
        <div className="gn-glass kpi hero2"><span>Customer actions</span><b>{n(h.taps + h.reserves + h.orders)}</b><em>{n(h.taps)} tapped for details · {n(h.reserves)} reserved · {n(h.orders)} orders</em></div>
        <div className="gn-glass kpi warn"><span>Searches lost to other pharmacies</span><b>{n(h.lost)}</b><em>for medicines you list, but your branches weren't shown</em></div>
        <div className={`gn-glass kpi ${h.staleBranches ? 'warn' : ''}`}><span>Branches with stock older than 14 days</span><b>{h.staleBranches} of {h.branches}</b><em>{h.lastUpdateDays != null ? `latest update ${h.lastUpdateDays} days ago` : 'no updates yet'}</em></div>
      </section>

      {data.recs.length > 0 && (
        <section className="gn-glass gn-card bz-recs">
          <div className="gn-card-h"><h2>What to do this month</h2><span className="gn-muted">Worked out from the numbers in this report</span></div>
          <ol>{data.recs.map((r, i) => <li key={i}><b>{i + 1}</b><span>{r}</span></li>)}</ol>
        </section>
      )}

      <section className="gn-glass gn-card">
        <div className="gn-card-h"><h2>Branch league</h2><span className="gn-muted">Ranked by how often each branch appeared in results</span></div>
        <div className="gn-table-wrap">
          <table className="gn-table">
            <thead><tr><th>#</th><th>Branch</th><th>Town</th><th>Appeared in results</th><th>Change</th><th>Tapped</th><th>Reserved</th><th>Medicines listed</th><th>Stock updated</th></tr></thead>
            <tbody>{data.league.map((b, i) => (
              <tr key={b.branch}>
                <td className="rk">{i + 1}</td><td><b>{b.branch}</b></td><td>{b.town}</td>
                <td><div className="bz-cell"><span className="bz-bar"><i style={{ width: `${(b.shown / maxShown) * 100}%` }} /></span><b>{b.shown}</b></div></td>
                <td><Delta v={b.change} /></td><td>{b.taps}</td><td>{b.reserves}</td><td>{n(b.listings)}</td>
                <td className={b.staleDays == null || b.staleDays > 14 ? 'gn-hi' : 'gn-lo'}>{b.staleDays == null ? 'never' : b.staleDays === 0 ? 'today' : `${b.staleDays} days ago`}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </section>

      <section className="gn-glass gn-card">
        <div className="gn-card-h"><h2>Day by day</h2><div className="gn-legend"><span><i style={{ background: C.teal }} />All searches on ChekaMeds</span><span><i style={{ background: C.gold }} />Searches that showed {data.business}</span></div></div>
        <div style={{ height: 240 }}>
          <ResponsiveContainer>
            <AreaChart data={data.daily} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
              <defs>
                <linearGradient id="bzA" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.teal} stopOpacity={0.4} /><stop offset="100%" stopColor={C.teal} stopOpacity={0} /></linearGradient>
                <linearGradient id="bzB" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.gold} stopOpacity={0.55} /><stop offset="100%" stopColor={C.gold} stopOpacity={0} /></linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,.06)" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: 'rgba(255,255,255,.5)', fontSize: 11 }} axisLine={false} tickLine={false} interval={Math.ceil(data.daily.length / 10)} />
              <YAxis tick={{ fill: 'rgba(255,255,255,.5)', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ background: 'rgba(14,16,38,.92)', border: '1px solid rgba(255,255,255,.14)', borderRadius: 12, color: '#fff' }} labelFormatter={(l) => `${data.monthLabel.split(' ')[0]} ${l}`} formatter={(v: number, k: string) => [v, k === 'searches' ? 'All searches' : `Showed ${data.business}`]} />
              <Area type="monotone" dataKey="searches" stroke={C.teal} strokeWidth={2} fill="url(#bzA)" />
              <Area type="monotone" dataKey="yours" stroke={C.gold} strokeWidth={2} fill="url(#bzB)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="gn-two">
        <div className="gn-glass gn-card">
          <div className="gn-card-h"><h2>Where your customers were</h2></div>
          {data.origins.length ? <Bars rows={data.origins} color={C.violet} /> : <p className="gn-muted">No appearances yet this month.</p>}
          <p className="gn-fine">"Town not given" means the person didn't share a town or location when searching.</p>
        </div>
        <div className="gn-glass gn-card">
          <div className="gn-card-h"><h2>When they saw you</h2></div>
          <div className="gn-callouts">
            {data.peakDay && <div><b>{data.peakDay}</b><span>busiest day</span></div>}
            {data.peakHour != null && <div><b>{fmtH(data.peakHour)}</b><span>busiest hour</span></div>}
          </div>
          <Heat heat={data.heat} />
        </div>
      </section>

      <section className="gn-glass gn-card">
        <div className="gn-card-h"><h2>Medicines that brought customers to you</h2><span className="gn-muted">Searches that showed one of your branches · 3 or more only</span></div>
        <div className="gn-table-wrap">
          <table className="gn-table">
            <thead><tr><th>Medicine</th><th>Searches</th><th>Your branches stocking</th><th>Other pharmacies stocking</th><th>Your price</th><th>Market price</th></tr></thead>
            <tbody>
              {data.drivers.map((d) => (
                <tr key={d.name}><td><b>{d.name}</b></td><td>{d.searches}</td><td>{d.branchesStocking} of {h.branches}</td><td>{d.competitors}</td>
                  <td>{d.yourPrice != null ? `P${d.yourPrice.toFixed(2)}` : '–'}</td>
                  <td>{d.marketPrice != null ? <span className={d.yourPrice != null && d.yourPrice > d.marketPrice * 1.1 ? 'gn-hi' : d.yourPrice != null && d.yourPrice < d.marketPrice * 0.9 ? 'gn-lo' : ''}>P{d.marketPrice.toFixed(2)}</span> : <span className="gn-muted">–</span>}</td></tr>
              ))}
              {data.drivers.length === 0 && <tr><td colSpan={6} className="gn-muted">Not enough searches yet this month.</td></tr>}
            </tbody>
          </table>
        </div>
        <p className="gn-fine">Market price is the middle of the lowest prices listed by other pharmacies (not your branches), shown when at least 3 list one. Other pharmacies are never named.</p>
      </section>

      <section className="gn-two">
        <div className="gn-glass gn-card opp">
          <h2>Lost to other pharmacies</h2><p className="gn-muted">Medicines you list where results showed others, not you.</p>
          <ol>{data.lostTop.map((m) => <li key={m.name}><span>{m.name}</span><b>{m.searches}</b></li>)}</ol>
          {data.lostTop.length === 0 && <p className="gn-muted">None this month.</p>}
        </div>
        <div className="gn-glass gn-card opp">
          <h2>Demand nobody met</h2><p className="gn-muted">Searched, found at no pharmacy, and not on your list.</p>
          <ol>{data.unmetTop.map((m) => <li key={m.name}><span>{m.name}</span><b>{m.searches}</b></li>)}</ol>
          {data.unmetTop.length === 0 && <p className="gn-muted">None this month.</p>}
        </div>
      </section>

      <section className="gn-glass gn-card">
        <div className="gn-card-h"><h2>Health signals in your towns</h2><span className="gn-muted">from ChekaMeds Pulse</span></div>
        {data.signals.length ? data.signals.map((s, i) => <div key={i} className={`gn-signal ${s.level}`}><b>{s.label} · {s.place}</b><span>{s.action}</span></div>) : <p className="gn-muted">No unusual health signals right now.</p>}
      </section>

      <div className="gn-foot">
        Based on {n(h.nationalSearches)} cleaned medicine searches on ChekaMeds (WhatsApp and web) in {data.monthLabel}. Adverts, greetings and repeat searches by the same person on the same day are removed. "Appeared in results" counts searches whose results listed one of your branches.
        This report contains no customer names, phone numbers or individual searches. © IBLIM Enterprises (Pty) Ltd.
      </div>
    </div>
  );
}

const EXTRA = `
.gn .kpi.hero2{background:linear-gradient(150deg,rgba(184,134,0,.26),rgba(125,108,242,.1));border-color:rgba(232,177,11,.35)}
.bz-recs ol{list-style:none;margin:0;padding:0;display:grid;gap:10px}
.bz-recs li{display:grid;grid-template-columns:30px 1fr;gap:12px;align-items:start;padding:12px 14px;border-radius:14px;background:rgba(255,255,255,.045);font-size:.9rem;line-height:1.45}
.bz-recs li b{width:28px;height:28px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(135deg,#e8b10b,#f5d36b);color:#141a33;font-size:.85rem}
.bz-cell{display:flex;align-items:center;gap:10px;min-width:140px}.bz-bar{flex:1;height:8px;border-radius:999px;background:rgba(255,255,255,.07);overflow:hidden}.bz-bar i{display:block;height:100%;background:#b88600;border-radius:999px}
`;
