import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

/* ChekaMeds Pulse – mark an alert from the signed WhatsApp link:
   checked (looked into it), confirmed (real problem) or false alarm. */

type AlertRow = {
  id: string; week: string; town_name: string; label: string; level: 'watch' | 'alert'; kind: string;
  reasons: string[]; action: string | null; owner: string | null;
  status: 'new' | 'checked' | 'confirmed' | 'false_alarm'; status_note: string | null; status_by: string | null; status_at: string | null;
};

const LABEL: Record<string, string> = { new: 'Not yet reviewed', checked: 'Checked', confirmed: 'Confirmed: real problem', false_alarm: 'False alarm' };

export default function PulseAck() {
  const [q] = useSearchParams();
  const params = { a: q.get('a') || '', by: q.get('by') || '', s: q.get('s') || '' };
  const [alert, setAlert] = useState<AlertRow | null>(null);
  const [you, setYou] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    document.title = 'Review Pulse alert | ChekaMeds';
    fetch(`/api/pulse-ack?${new URLSearchParams(params)}`).then(async (r) => {
      const j = await r.json(); if (!r.ok) throw new Error(j.error || 'Could not load');
      setAlert(j.alert); setYou(j.you);
    }).catch((e) => setError(String(e.message || e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async (status: string) => {
    setSaving(status); setError(null);
    try {
      const r = await fetch('/api/pulse-ack', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...params, status, note }) });
      const j = await r.json(); if (!r.ok) throw new Error(j.error || 'Could not save');
      setAlert(j.alert); setSaved(true);
    } catch (e) { setError(String((e as Error).message || e)); }
    finally { setSaving(null); }
  };

  return (
    <div className="pa">
      <style>{CSS}</style>
      <main>
        <p className="kicker">ChekaMeds Pulse · alert review</p>
        {error && !alert && <div className="card"><h1>Link not valid</h1><p className="muted">{error} Ask ChekaMeds to resend the alert.</p></div>}
        {!alert && !error && <p className="muted">Loading the alert…</p>}
        {alert && (
          <div className="card">
            <span className={`tag ${alert.level}`}>{alert.level === 'alert' ? 'Alert' : 'Watch'}{alert.kind === 'supply' ? ' · supply' : ''}</span>
            <h1>{alert.label} · {alert.town_name}</h1>
            <p className="muted">Week of {new Date(alert.week + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })}{you ? ` · for ${you}` : ''}</p>
            <ul>{alert.reasons.map((r) => <li key={r}>{r}</li>)}</ul>
            {alert.action && <div className="action"><b>Suggested action</b><p>{alert.action}</p>{alert.owner && <span>Responsible: {alert.owner}</span>}</div>}

            <div className="status">Current status: <b>{LABEL[alert.status]}</b>{alert.status_by ? ` · ${alert.status_by}` : ''}{alert.status_at ? `, ${new Date(alert.status_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}` : ''}</div>

            {saved ? (
              <p className="done">Thank you. Your review has been recorded and will show on the Pulse dashboard. <Link to="/pulse">Open Pulse</Link></p>
            ) : (
              <>
                <label htmlFor="pa-note">Note (optional)</label>
                <textarea id="pa-note" rows={3} maxLength={500} placeholder="e.g. Clinic attendance normal; pharmacy restocked on Monday" value={note} onChange={(e) => setNote(e.target.value)} />
                <div className="btns">
                  <button disabled={!!saving} onClick={() => submit('checked')}>{saving === 'checked' ? 'Saving…' : 'Checked: looking into it'}</button>
                  <button disabled={!!saving} className="red" onClick={() => submit('confirmed')}>{saving === 'confirmed' ? 'Saving…' : 'Confirmed: real problem'}</button>
                  <button disabled={!!saving} className="ghost" onClick={() => submit('false_alarm')}>{saving === 'false_alarm' ? 'Saving…' : 'False alarm'}</button>
                </div>
                {error && <p className="err">{error}</p>}
              </>
            )}
            <p className="fine">Your answer trains Pulse: confirmed alerts and false alarms are used to tune thresholds. A Pulse alert is a prompt to check, not a diagnosis.</p>
          </div>
        )}
      </main>
    </div>
  );
}

const CSS = `
.pa{min-height:100vh;background:#080a19;color:#fff;font-family:Inter,system-ui,sans-serif;display:flex;justify-content:center;padding:28px 16px}
.pa main{width:100%;max-width:620px}
.pa .kicker{color:#e8b10b;font-weight:600;font-size:.8rem;letter-spacing:.04em;text-transform:uppercase;margin:0 0 12px}
.pa .card{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:20px;padding:22px}
.pa h1{font-size:1.4rem;font-weight:550;margin:10px 0 4px}
.pa .muted{color:rgba(255,255,255,.6);margin:0}
.pa ul{margin:14px 0;padding-left:18px;display:grid;gap:6px;color:rgba(255,255,255,.85);line-height:1.5}
.pa .tag{display:inline-block;font-size:.74rem;font-weight:650;padding:4px 10px;border-radius:999px}
.pa .tag.alert{background:rgba(248,113,113,.15);color:#fca5a5}.pa .tag.watch{background:rgba(251,191,90,.15);color:#fbbf5a}
.pa .action{background:rgba(232,177,11,.08);border:1px solid rgba(232,177,11,.3);border-radius:14px;padding:12px 14px;margin:6px 0 14px}
.pa .action b{color:#e8b10b;font-size:.8rem;text-transform:uppercase;letter-spacing:.03em}
.pa .action p{margin:6px 0}.pa .action span{font-size:.84rem;color:rgba(255,255,255,.6)}
.pa .status{font-size:.9rem;color:rgba(255,255,255,.75);margin:6px 0 14px}
.pa label{display:block;font-size:.85rem;color:rgba(255,255,255,.7);margin-bottom:6px}
.pa textarea{width:100%;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.18);border-radius:12px;color:#fff;padding:10px 12px;font:inherit;resize:vertical}
.pa .btns{display:grid;gap:8px;margin-top:12px}
.pa button{padding:13px 16px;border-radius:999px;border:0;background:#e9e9e9;color:#0a0707;font:600 .95rem Inter,system-ui,sans-serif;cursor:pointer}
.pa button.red{background:#f87171;color:#1b0a0a}
.pa button.ghost{background:transparent;color:#fff;border:1px solid rgba(255,255,255,.3)}
.pa button:disabled{opacity:.6;cursor:default}
.pa .done{background:rgba(94,234,168,.1);border:1px solid rgba(94,234,168,.3);color:#c8f7e1;border-radius:12px;padding:12px 14px}
.pa .done a{color:#fff}
.pa .err{color:#fca5a5}
.pa .fine{font-size:.78rem;color:rgba(255,255,255,.45);margin:14px 0 0;line-height:1.5}
`;
