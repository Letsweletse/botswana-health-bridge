import { useState } from 'react';
import { X } from 'lucide-react';

const VOTE_URL = 'https://foyaglobal.com/vote/1O77EDOK';

/** FOYA Awards voting rounds. The banner shows the first round that has not closed. */
const ROUNDS = [
  { id: 'bw', label: 'Botswana voting', closes: '2026-11-04T23:59:59+02:00' },
  { id: 'africa', label: 'Africa-wide voting', closes: '2026-12-02T23:59:59+02:00' },
];

const read = (k: string) => {
  try { return window.localStorage.getItem(k); } catch { return null; }
};
const write = (k: string, v: string) => {
  try { window.localStorage.setItem(k, v); } catch { /* storage unavailable */ }
};

const VoteBanner = () => {
  const round = ROUNDS.find((r) => Date.parse(r.closes) > Date.now());

  /* Decided during the first render, not in an effect: deciding later makes
     the banner appear after paint and push the whole page down. */
  const [open, setOpen] = useState(() =>
    !!round && read(`cm-vote-dismissed-${round.id}`) !== '1'
  );

  if (!round || !open) return null;

  const days = Math.max(0, Math.ceil((Date.parse(round.closes) - Date.now()) / 86400000));
  const close = () => { setOpen(false); write(`cm-vote-dismissed-${round.id}`, '1'); };

  return (
    <aside className="cm-vote" aria-label="FOYA Awards voting">
      <style>{`
        .cm-vote{position:relative;background:linear-gradient(180deg,#0a1a13,#06100b);border-bottom:1px solid rgba(41,242,154,.16);font-family:'DM Sans',system-ui,sans-serif}
        .cm-vote::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(41,242,154,.55),transparent)}
        .cm-vote-in{max-width:1220px;width:calc(100% - 48px);margin:0 auto;display:flex;align-items:center;gap:18px;padding:11px 0}
        .cm-vote-flag{font-size:1.1rem;line-height:1;flex-shrink:0}
        .cm-vote-copy{flex:1;min-width:0;font-size:.85rem;color:#d6e8de;line-height:1.45}
        .cm-vote-copy b{color:#f4fff9;font-weight:600}
        .cm-vote-copy span{color:#8fa69a}
        .cm-vote-cta{flex-shrink:0;display:inline-flex;align-items:center;gap:8px;background:#29f29a;color:#04120b;font-weight:700;font-size:.82rem;padding:9px 17px;border-radius:7px;text-decoration:none;transition:background .18s ease}
        .cm-vote-cta:hover{background:#4dffb0}
        .cm-vote-cta:focus-visible,.cm-vote-x:focus-visible{outline:2px solid #29f29a;outline-offset:3px}
        .cm-vote-x{flex-shrink:0;background:none;border:0;color:#6f8578;cursor:pointer;padding:5px;border-radius:7px;display:grid;place-items:center}
        .cm-vote-x:hover{color:#d6e8de}
        @media(max-width:760px){
          .cm-vote-in{width:calc(100% - 28px);flex-wrap:wrap;gap:10px 12px;padding:10px 0 12px}
          .cm-vote-copy{flex:1 1 100%;order:1;font-size:.8rem;padding-right:26px}
          .cm-vote-flag{order:0}
          .cm-vote-cta{order:2;flex:1 1 auto;justify-content:center;padding:10px 16px}
          .cm-vote-x{position:absolute;top:8px;right:12px}
        }
      `}</style>
      <div className="cm-vote-in">
        <span className="cm-vote-flag" aria-hidden="true">🇧🇼</span>
        <p className="cm-vote-copy">
          <b>ChekaMeds is Botswana&rsquo;s nominee</b> for Health &amp; Wellness Innovation at the FOYA Awards.{' '}
          <span>Free vote, once a day &middot; {round.label} closes in {days} {days === 1 ? 'day' : 'days'}.</span>
        </p>
        <a className="cm-vote-cta" href={VOTE_URL} target="_blank" rel="noopener noreferrer">Vote for ChekaMeds</a>
        <button className="cm-vote-x" onClick={close} aria-label="Hide voting banner"><X size={15} /></button>
      </div>
    </aside>
  );
};

export default VoteBanner;
