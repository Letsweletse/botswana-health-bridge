import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

/* ChekaMeds Pulse – manage who receives alerts, and see what they decided.
   Admins only (wrapped in AdminRoute; the API re-checks the admin role). */

type Sub = {
  id?: string; name: string; role: string; organisation: string | null; whatsapp: string | null; email: string | null;
  towns: string[]; groups: string[]; min_level: 'watch' | 'alert'; weekly_bulletin: boolean; active: boolean;
  last_bulletin?: string | null; created_at?: string;
};
type AlertRow = {
  id: string; week: string; town_name: string; label: string; level: string; kind: string; status: string;
  status_note: string | null; status_by: string | null; status_at: string | null; notified_at: string | null; notified_count: number;
};

const ROLES: [string, string][] = [['dhmt', 'District health team (DHMT)'], ['cms', 'Central Medical Stores'], ['moh', 'Ministry of Health'], ['bomra', 'BOMRA'], ['pharmacy', 'Pharmacy'], ['founder', 'ChekaMeds'], ['other', 'Other']];
const ROLE_LABEL = Object.fromEntries(ROLES);
const STATUS: Record<string, string> = { new: 'Awaiting review', checked: 'Checked', confirmed: 'Confirmed', false_alarm: 'False alarm' };
const blank: Sub = { name: '', role: 'dhmt', organisation: '', whatsapp: '', email: '', towns: [], groups: [], min_level: 'alert', weekly_bulletin: true, active: true };
const fmt = (d: string | null) => (d ? new Date(d).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '–');
const fmtWeek = (w: string) => new Date(w + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });

async function api(method: 'GET' | 'POST', body?: unknown) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const r = await fetch('/api/pulse-admin', {
    method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'Request failed');
  return j;
}

export default function PulseAdmin() {
  const [subs, setSubs] = useState<Sub[]>([]);
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [emailOn, setEmailOn] = useState(false);
  const [towns, setTowns] = useState<{ id: string; name: string }[]>([]);
  const [groups, setGroups] = useState<{ id: string; label: string }[]>([]);
  const [form, setForm] = useState<Sub | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try { const j = await api('GET'); setSubs(j.subscribers || []); setAlerts(j.alerts || []); setEmailOn(!!j.email_enabled); }
    catch (e) { setMsg({ ok: false, text: String((e as Error).message) }); }
  }, []);
  useEffect(() => {
    document.title = 'Pulse recipients | ChekaMeds admin';
    load();
    fetch('/api/pulse').then((r) => r.json()).then((j) => { setTowns(j.towns || []); setGroups(j.groups || []); }).catch(() => {});
  }, [load]);

  const townName = useMemo(() => Object.fromEntries(towns.map((t) => [t.id, t.name])), [towns]);
  const groupName = useMemo(() => Object.fromEntries(groups.map((g) => [g.id, g.label])), [groups]);

  const save = async () => {
    if (!form) return; setBusy(true); setMsg(null);
    try { await api('POST', { action: 'save', subscriber: form }); setForm(null); setMsg({ ok: true, text: 'Recipient saved.' }); await load(); }
    catch (e) { setMsg({ ok: false, text: String((e as Error).message) }); }
    finally { setBusy(false); }
  };
  const toggle = async (s: Sub) => {
    try { await api('POST', { action: 'active', id: s.id, active: !s.active }); await load(); }
    catch (e) { setMsg({ ok: false, text: String((e as Error).message) }); }
  };
  const test = async (s: Sub) => {
    setMsg(null);
    try {
      const j = await api('POST', { action: 'test', id: s.id });
      const parts = Object.entries(j.result || {}).map(([k, v]: any) => `${k === 'whatsapp' ? 'WhatsApp' : 'Email'} ${v.ok ? 'sent' : `failed (${v.error || 'error'})`}`);
      setMsg({ ok: parts.every((p) => p.includes('sent')), text: `Test to ${s.name}: ${parts.join(', ') || 'no channel available'}.` });
    } catch (e) { setMsg({ ok: false, text: String((e as Error).message) }); }
  };
  const toggleIn = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

  return (
    <div className="pad">
      <style>{CSS}</style>
      <header className="pad-head">
        <div><p className="kicker">ChekaMeds Pulse · admin</p><h1>Alert recipients</h1></div>
        <div className="links"><Link to="/pulse">Dashboard</Link><Link to="/pulse/bulletin">Bulletin</Link><Link to="/admin">Admin panel</Link></div>
      </header>

      <p className="muted">People here receive new Pulse alerts every morning at 08:00 and the weekly bulletin on Tuesdays. WhatsApp is active.
        {emailOn ? ' Email is active.' : ' Email switches on once chekameds.co.bw is verified in Resend and RESEND_API_KEY is set in Vercel.'}</p>
      {msg && <div className={`note ${msg.ok ? 'ok' : 'bad'}`}>{msg.text}</div>}

      <section className="card">
        <div className="row-h"><h2>Recipients ({subs.filter((s) => s.active).length} active)</h2><button className="primary" onClick={() => setForm({ ...blank })}>+ Add recipient</button></div>
        <div className="scroll">
          <table>
            <thead><tr><th>Name</th><th>Role</th><th>Channels</th><th>Towns</th><th>Signals</th><th>Level</th><th>Bulletin</th><th></th></tr></thead>
            <tbody>
              {subs.map((s) => (
                <tr key={s.id} className={s.active ? '' : 'off'}>
                  <td><b>{s.name}</b>{s.organisation && <div className="muted sm">{s.organisation}</div>}</td>
                  <td>{ROLE_LABEL[s.role] || s.role}</td>
                  <td className="sm">{s.whatsapp && <div>WhatsApp +{s.whatsapp}</div>}{s.email && <div>{s.email}</div>}</td>
                  <td className="sm">{s.towns?.length ? s.towns.map((t) => townName[t] || t).join(', ') : 'All of Botswana'}</td>
                  <td className="sm">{s.groups?.length ? s.groups.map((g) => groupName[g] || g).join(', ') : 'All signals'}</td>
                  <td>{s.min_level === 'watch' ? 'Watch + alert' : 'Alerts only'}</td>
                  <td>{s.weekly_bulletin ? 'Yes' : 'No'}</td>
                  <td className="acts">
                    <button onClick={() => setForm({ ...s, organisation: s.organisation || '', whatsapp: s.whatsapp || '', email: s.email || '' })}>Edit</button>
                    <button onClick={() => test(s)} disabled={!s.active}>Send test</button>
                    <button onClick={() => toggle(s)}>{s.active ? 'Switch off' : 'Switch on'}</button>
                  </td>
                </tr>
              ))}
              {subs.length === 0 && <tr><td colSpan={8} className="muted">No recipients yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {form && (
        <section className="card form">
          <h2>{form.id ? 'Edit recipient' : 'Add recipient'}</h2>
          <div className="grid">
            <label>Name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Dr K. Molefe" /></label>
            <label>Role<select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>{ROLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
            <label>Organisation<input value={form.organisation || ''} onChange={(e) => setForm({ ...form, organisation: e.target.value })} placeholder="e.g. Gaborone DHMT" /></label>
            <label>WhatsApp number<input value={form.whatsapp || ''} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} placeholder="71234567" inputMode="tel" /></label>
            <label>Email<input value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="name@health.gov.bw" type="email" /></label>
            <label>Alert level<select value={form.min_level} onChange={(e) => setForm({ ...form, min_level: e.target.value as 'watch' | 'alert' })}><option value="alert">Alerts only</option><option value="watch">Watch and alerts</option></select></label>
          </div>
          <fieldset><legend>Towns <span className="muted sm">(none selected = all of Botswana, including national alerts)</span></legend>
            <div className="chips">{towns.map((t) => <button type="button" key={t.id} className={form.towns.includes(t.id) ? 'on' : ''} onClick={() => setForm({ ...form, towns: toggleIn(form.towns, t.id) })}>{t.name}</button>)}</div>
          </fieldset>
          <fieldset><legend>Signals <span className="muted sm">(none selected = all signals)</span></legend>
            <div className="chips">{groups.map((g) => <button type="button" key={g.id} className={form.groups.includes(g.id) ? 'on' : ''} onClick={() => setForm({ ...form, groups: toggleIn(form.groups, g.id) })}>{g.label}</button>)}</div>
          </fieldset>
          <label className="check"><input type="checkbox" checked={form.weekly_bulletin} onChange={(e) => setForm({ ...form, weekly_bulletin: e.target.checked })} /> Send the weekly bulletin on Tuesdays</label>
          <div className="btns"><button className="primary" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save recipient'}</button><button onClick={() => setForm(null)}>Cancel</button></div>
          <p className="muted sm">Add people only with their agreement. Their number and email are used only to send Pulse alerts and are never shown publicly.</p>
        </section>
      )}

      <section className="card">
        <h2>Alerts and officer reviews</h2>
        <div className="scroll">
          <table>
            <thead><tr><th>Week</th><th>Place</th><th>Signal</th><th>Level</th><th>Sent</th><th>Review</th><th>By</th><th>Note</th></tr></thead>
            <tbody>
              {alerts.map((a) => (
                <tr key={a.id}>
                  <td>{fmtWeek(a.week)}</td><td><b>{a.town_name}</b></td><td>{a.label}{a.kind === 'supply' ? ' (supply)' : ''}</td>
                  <td><span className={`tag ${a.level}`}>{a.level === 'alert' ? 'Alert' : 'Watch'}</span></td>
                  <td className="sm">{a.notified_at ? `${fmt(a.notified_at)} · ${a.notified_count}` : 'Not yet'}</td>
                  <td><span className={`st ${a.status}`}>{STATUS[a.status] || a.status}</span>{a.status_at && <div className="muted sm">{fmt(a.status_at)}</div>}</td>
                  <td className="sm">{a.status_by || '–'}</td><td className="sm">{a.status_note || '–'}</td>
                </tr>
              ))}
              {alerts.length === 0 && <tr><td colSpan={8} className="muted">No alerts yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

const CSS = `
.pad{min-height:100vh;background:#080a19;color:#fff;font-family:Inter,system-ui,sans-serif;padding:28px clamp(16px,4vw,48px) 80px}
.pad-head{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;flex-wrap:wrap;margin-bottom:10px}
.pad .kicker{color:#e8b10b;font-weight:600;font-size:.78rem;letter-spacing:.04em;text-transform:uppercase;margin:0}
.pad h1{font-size:1.8rem;font-weight:550;margin:6px 0 0}
.pad h2{font-size:1.1rem;font-weight:550;margin:0 0 12px}
.pad .links{display:flex;gap:14px}.pad .links a{color:rgba(255,255,255,.75);font-size:.9rem}
.pad .muted{color:rgba(255,255,255,.6)}.pad .sm{font-size:.82rem}
.pad .note{margin:12px 0;padding:10px 14px;border-radius:12px;font-size:.9rem}
.pad .note.ok{background:rgba(94,234,168,.1);border:1px solid rgba(94,234,168,.3);color:#c8f7e1}
.pad .note.bad{background:rgba(248,113,113,.1);border:1px solid rgba(248,113,113,.35);color:#fecaca}
.pad .card{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:18px;padding:18px;margin-top:16px}
.pad .row-h{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}
.pad .scroll{overflow-x:auto}
.pad table{width:100%;border-collapse:collapse;font-size:.88rem;min-width:860px}
.pad th{text-align:left;color:rgba(255,255,255,.5);font-weight:500;font-size:.78rem;padding:8px;border-bottom:1px solid rgba(255,255,255,.1)}
.pad td{padding:10px 8px;border-bottom:1px solid rgba(255,255,255,.07);vertical-align:top;color:rgba(255,255,255,.85)}
.pad tr.off td{opacity:.45}
.pad button{padding:7px 12px;border-radius:999px;border:1px solid rgba(255,255,255,.25);background:transparent;color:#fff;font:500 .82rem Inter,system-ui,sans-serif;cursor:pointer;margin:0 6px 6px 0}
.pad button:disabled{opacity:.4;cursor:default}
.pad button.primary{background:#e8b10b;border-color:#e8b10b;color:#141a33;font-weight:600}
.pad .acts{white-space:nowrap}
.pad .grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
.pad label{display:grid;gap:6px;font-size:.84rem;color:rgba(255,255,255,.75)}
.pad input,.pad select{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.18);border-radius:10px;color:#fff;padding:10px 12px;font:inherit}
.pad select option{color:#000}
.pad fieldset{border:0;padding:0;margin:16px 0 0}.pad legend{font-size:.84rem;color:rgba(255,255,255,.75);margin-bottom:8px}
.pad .chips button.on{background:#fff;color:#0a0707;border-color:#fff}
.pad .check{display:flex;align-items:center;gap:8px;margin-top:14px}
.pad .check input{width:auto}
.pad .btns{margin-top:16px}
.pad .tag{font-size:.72rem;font-weight:650;padding:3px 8px;border-radius:999px}
.pad .tag.alert{background:rgba(248,113,113,.15);color:#fca5a5}.pad .tag.watch{background:rgba(251,191,90,.15);color:#fbbf5a}
.pad .st{font-weight:600}.pad .st.confirmed{color:#fca5a5}.pad .st.checked{color:#fbbf5a}.pad .st.false_alarm{color:#5eeaa8}.pad .st.new{color:rgba(255,255,255,.6)}
@media (max-width:760px){.pad .grid{grid-template-columns:1fr}}
`;
