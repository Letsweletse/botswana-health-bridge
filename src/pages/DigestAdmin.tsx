import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

/* Weekly pharmacy digest – preview every pharmacy's message, send yourself a test,
   and switch the Monday sending on or off. Admins only. */

type D = {
  clinic: string; townName: string | null; whatsapp: string | null; email: string | null; optedOut: boolean; weekLabel: string;
  stock: { listings: number; inStock: number; staleDays: number | null };
  demand: { all: number; town: number | null; national: number };
  missed: { total: number }; orders: number;
  whatsappText: string; emailSubject: string; emailHtml: string;
};
type Resp = { week: string; live: boolean; setup_needed: boolean; email_enabled: boolean; digests: D[]; skipped: { clinic: string; reason: string }[]; log: { clinic_name: string; week: string; whatsapp_ok: boolean | null; email_ok: boolean | null; error: string | null; sent_at: string }[] };

async function api(method: 'GET' | 'POST', body?: unknown) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const r = await fetch(`/api/pharmacy-digest${method === 'GET' ? '?admin=1' : ''}`, {
    method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'Request failed');
  return j;
}
const mask = (p: string | null) => (p ? `+${p.slice(0, 3)} ${p.slice(3, 5)}•• ••${p.slice(-2)}` : '–');

export default function DigestAdmin() {
  const [data, setData] = useState<Resp | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  const [view, setView] = useState<'whatsapp' | 'email'>('whatsapp');
  const [testWa, setTestWa] = useState(''); const [testEmail, setTestEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState('');

  const load = useCallback(async () => {
    try { const j: Resp = await api('GET'); setData(j); setSel((s) => s || j.digests[0]?.clinic || null); setErr(null); }
    catch (e) { setErr((e as Error).message); }
  }, []);
  useEffect(() => { document.title = 'Pharmacy digest | ChekaMeds admin'; load(); }, [load]);

  const cur = useMemo(() => data?.digests.find((d) => d.clinic === sel) || null, [data, sel]);
  const list = useMemo(() => (data?.digests || []).filter((d) => d.clinic.toLowerCase().includes(filter.toLowerCase())), [data, filter]);
  const reach = useMemo(() => {
    const ds = (data?.digests || []).filter((d) => !d.optedOut);
    return { total: ds.length, wa: ds.filter((d) => d.whatsapp).length, em: ds.filter((d) => d.email).length };
  }, [data]);

  const test = async () => {
    if (!cur) return; setBusy(true); setMsg(null);
    try {
      const j = await api('POST', { action: 'test', clinic: cur.clinic, whatsapp: testWa || undefined, email: testEmail || undefined });
      const parts = Object.entries(j.result || {}).map(([k, v]: any) => `${k === 'whatsapp' ? 'WhatsApp' : 'Email'} ${v.ok ? 'sent' : `failed (${v.error || 'error'})`}`);
      setMsg({ ok: parts.length > 0 && parts.every((p) => p.includes('sent')), text: parts.length ? `Test of ${cur.clinic}'s digest: ${parts.join(', ')}. Only you received it.` : 'Enter your own WhatsApp number or email first.' });
    } catch (e) { setMsg({ ok: false, text: (e as Error).message }); } finally { setBusy(false); }
  };
  const setLive = async (value: boolean) => {
    if (value && !window.confirm(`Switch on weekly sending?\n\nEvery Monday at 08:00, ${reach.total} pharmacies will receive their digest (${reach.wa} by WhatsApp, ${reach.em} by email). Each pharmacy gets it once a week and can unsubscribe from the link in the message.`)) return;
    try { await api('POST', { action: 'live', value }); setMsg({ ok: true, text: value ? 'Weekly sending is ON. The first digests go out next Monday at 08:00.' : 'Weekly sending is OFF.' }); await load(); }
    catch (e) { setMsg({ ok: false, text: (e as Error).message }); }
  };
  const opt = async (d: D) => {
    try { await api('POST', { action: d.optedOut ? 'optin' : 'optout', clinic: d.clinic }); await load(); }
    catch (e) { setMsg({ ok: false, text: (e as Error).message }); }
  };

  return (
    <div className="dg">
      <style>{CSS}</style>
      <header className="dg-head">
        <div><p className="kicker">ChekaMeds · admin</p><h1>Weekly pharmacy digest</h1></div>
        <div className="links"><Link to="/admin/pulse">Pulse recipients</Link><Link to="/admin">Admin panel</Link></div>
      </header>
      {err && <div className="note bad">{err}</div>}
      {!data && !err && <p className="muted">Building this week's digests…</p>}
      {data && (<>
        {data.setup_needed && <div className="note bad">One-time setup: run the pharmacy digest SQL in Supabase (SQL Editor) before switching on sending. Previews and tests work already.</div>}
        <section className="card top">
          <div>
            <p className="muted sm">Covers last week (from {new Date(data.week + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })}). Sent Mondays at 08:00.</p>
            <div className="stats">
              <div><b>{reach.total}</b><span>pharmacies will receive it</span></div>
              <div><b>{reach.wa}</b><span>by WhatsApp</span></div>
              <div><b>{reach.em}</b><span>by email{data.email_enabled ? '' : ' (email off)'}</span></div>
              <div><b>{data.skipped.length}</b><span>skipped (see below)</span></div>
            </div>
          </div>
          <div className={`live ${data.live ? 'on' : ''}`}>
            <span>Weekly sending</span><b>{data.live ? 'ON' : 'OFF'}</b>
            <button className={data.live ? '' : 'primary'} disabled={data.setup_needed} onClick={() => setLive(!data.live)}>{data.live ? 'Switch off' : 'Switch on'}</button>
          </div>
        </section>
        {msg && <div className={`note ${msg.ok ? 'ok' : 'bad'}`}>{msg.text}</div>}

        <section className="grid">
          <div className="card listc">
            <input className="search" placeholder="Find a pharmacy" value={filter} onChange={(e) => setFilter(e.target.value)} />
            <div className="list">
              {list.map((d) => (
                <button key={d.clinic} className={`item ${d.clinic === sel ? 'on' : ''} ${d.optedOut ? 'off' : ''}`} onClick={() => setSel(d.clinic)}>
                  <b>{d.clinic}</b>
                  <span>{d.townName || 'Town unknown'} · {d.stock.listings ? `${d.stock.listings} items` : 'no stock listed'}{d.stock.staleDays != null && d.stock.staleDays > 14 ? ' · stale' : ''}{d.optedOut ? ' · unsubscribed' : ''}</span>
                </button>
              ))}
            </div>
          </div>

          {cur && (
            <div className="card prev">
              <div className="prev-h">
                <div><h2>{cur.clinic}</h2><p className="muted sm">WhatsApp {mask(cur.whatsapp)} · Email {cur.email ? cur.email.replace(/^(.).*(@.*)$/, '$1•••$2') : '–'}</p></div>
                <button onClick={() => opt(cur)}>{cur.optedOut ? 'Resubscribe' : 'Stop sending to this pharmacy'}</button>
              </div>
              <div className="tabs"><button className={view === 'whatsapp' ? 'on' : ''} onClick={() => setView('whatsapp')}>WhatsApp</button><button className={view === 'email' ? 'on' : ''} onClick={() => setView('email')}>Email</button></div>
              {view === 'whatsapp'
                ? <div className="wa"><pre>{cur.whatsappText}</pre></div>
                : <><p className="muted sm">Subject: <b style={{ color: '#fff' }}>{cur.emailSubject}</b></p><iframe title="Email preview" srcDoc={cur.emailHtml} className="mail" /></>}
              <div className="testbox">
                <b>Send this digest to yourself</b>
                <div className="row">
                  <input placeholder="Your WhatsApp, e.g. 71234567" value={testWa} onChange={(e) => setTestWa(e.target.value)} inputMode="tel" />
                  <input placeholder="Your email" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} type="email" />
                  <button className="primary" disabled={busy} onClick={test}>{busy ? 'Sending…' : 'Send test'}</button>
                </div>
                <p className="muted sm">The test goes only to the number and email you type here, never to the pharmacy.</p>
              </div>
            </div>
          )}
        </section>

        {data.skipped.length > 0 && (
          <section className="card"><h2>Not receiving a digest ({data.skipped.length})</h2>
            <p className="muted sm">Add a mobile number (starting with 7) or an email to a pharmacy's account to include it.</p>
            <ul className="skip">{data.skipped.map((s) => <li key={s.clinic}><b>{s.clinic}</b><span>{s.reason}</span></li>)}</ul>
          </section>
        )}
        {data.log.length > 0 && (
          <section className="card"><h2>Sent</h2>
            <div className="scroll"><table><thead><tr><th>Week</th><th>Pharmacy</th><th>WhatsApp</th><th>Email</th><th>Sent</th></tr></thead>
              <tbody>{data.log.map((l) => <tr key={l.clinic_name + l.week}><td>{l.week}</td><td>{l.clinic_name}</td><td>{l.whatsapp_ok == null ? '–' : l.whatsapp_ok ? '✓' : '✗'}</td><td>{l.email_ok == null ? '–' : l.email_ok ? '✓' : '✗'}</td><td className="sm">{new Date(l.sent_at).toLocaleString('en-GB')}{l.error ? ` · ${l.error}` : ''}</td></tr>)}</tbody></table></div>
          </section>
        )}
      </>)}
    </div>
  );
}

const CSS = `
.dg{min-height:100vh;background:#080a19;color:#fff;font-family:Inter,system-ui,sans-serif;padding:28px clamp(16px,4vw,48px) 80px}
.dg-head{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;flex-wrap:wrap;margin-bottom:12px}
.dg .kicker{color:#e8b10b;font-weight:600;font-size:.78rem;letter-spacing:.04em;text-transform:uppercase;margin:0}
.dg h1{font-size:1.8rem;font-weight:550;margin:6px 0 0}.dg h2{font-size:1.1rem;font-weight:550;margin:0 0 10px}
.dg .links{display:flex;gap:14px}.dg .links a{color:rgba(255,255,255,.75);font-size:.9rem}
.dg .muted{color:rgba(255,255,255,.6)}.dg .sm{font-size:.82rem}
.dg .note{margin:12px 0;padding:10px 14px;border-radius:12px;font-size:.9rem}
.dg .note.ok{background:rgba(94,234,168,.1);border:1px solid rgba(94,234,168,.3);color:#c8f7e1}
.dg .note.bad{background:rgba(248,113,113,.1);border:1px solid rgba(248,113,113,.35);color:#fecaca}
.dg .card{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:18px;padding:18px;margin-top:16px;min-width:0}
.dg .top{display:flex;justify-content:space-between;gap:18px;flex-wrap:wrap;align-items:center}
.dg .stats{display:flex;gap:22px;flex-wrap:wrap;margin-top:8px}.dg .stats div{display:grid}.dg .stats b{font-size:1.5rem;color:#e8b10b}.dg .stats span{font-size:.78rem;color:rgba(255,255,255,.6)}
.dg .live{display:grid;gap:4px;justify-items:start;padding:14px 18px;border-radius:14px;border:1px solid rgba(255,255,255,.15)}
.dg .live span{font-size:.78rem;color:rgba(255,255,255,.6)}.dg .live b{font-size:1.3rem}.dg .live.on{border-color:rgba(94,234,168,.5)}.dg .live.on b{color:#5eeaa8}
.dg button{padding:7px 12px;border-radius:999px;border:1px solid rgba(255,255,255,.25);background:transparent;color:#fff;font:500 .82rem Inter,system-ui,sans-serif;cursor:pointer}
.dg button:disabled{opacity:.4;cursor:default}.dg button.primary{background:#e8b10b;border-color:#e8b10b;color:#141a33;font-weight:600}
.dg .grid{display:grid;grid-template-columns:minmax(240px,320px) minmax(0,1fr);gap:16px}
.dg input{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.18);border-radius:10px;color:#fff;padding:10px 12px;font:inherit;min-width:0}
.dg .search{width:100%;box-sizing:border-box}
.dg .list{max-height:640px;overflow:auto;margin-top:10px;display:grid;gap:6px}
.dg .item{display:grid;text-align:left;gap:2px;border-radius:12px;padding:10px 12px;border-color:rgba(255,255,255,.1)}
.dg .item.on{border-color:#e8b10b;background:rgba(232,177,11,.08)}.dg .item.off{opacity:.5}
.dg .item b{font-size:.88rem}.dg .item span{font-size:.75rem;color:rgba(255,255,255,.55)}
.dg .prev-h{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:flex-start}
.dg .tabs{display:flex;gap:6px;margin:6px 0 12px}.dg .tabs button.on{background:#fff;color:#0a0707;border-color:#fff}
.dg .wa{background:#0b141a;border-radius:14px;padding:16px}
.dg .wa pre{margin:0;max-width:440px;background:#005c4b;color:#e9edef;border-radius:10px;padding:12px 14px;white-space:pre-wrap;word-break:break-word;font:14px/1.45 system-ui,sans-serif}
.dg .mail{width:100%;height:620px;border:0;border-radius:12px;background:#f3f4f7}
.dg .testbox{margin-top:16px;padding-top:14px;border-top:1px solid rgba(255,255,255,.1)}
.dg .testbox .row{display:flex;gap:8px;flex-wrap:wrap;margin:8px 0}.dg .testbox input{flex:1 1 180px}
.dg .skip{list-style:none;padding:0;margin:8px 0 0;display:grid;gap:6px}.dg .skip li{display:flex;justify-content:space-between;gap:12px;font-size:.86rem;border-bottom:1px solid rgba(255,255,255,.07);padding:6px 0}.dg .skip span{color:rgba(255,255,255,.55)}
.dg .scroll{overflow-x:auto}.dg table{width:100%;border-collapse:collapse;font-size:.86rem;min-width:600px}
.dg th{text-align:left;color:rgba(255,255,255,.5);font-weight:500;font-size:.78rem;padding:8px;border-bottom:1px solid rgba(255,255,255,.1)}
.dg td{padding:8px;border-bottom:1px solid rgba(255,255,255,.07)}
@media (max-width:860px){.dg .grid{grid-template-columns:1fr}.dg .list{max-height:300px}}
`;
