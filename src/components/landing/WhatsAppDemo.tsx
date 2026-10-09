import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useInView, useReducedMotion } from 'framer-motion';
import { MapPin, MessageCircle, CheckCheck, Search } from 'lucide-react';

const WA_LINK =
  'https://wa.me/26771424486?text=' +
  encodeURIComponent('Hi ChekaMeds, I am looking for a medicine. Please help me find a pharmacy with availability.');

const QUERIES = ['Panado 500mg in Gaborone', 'Amoxicillin near Francistown', 'Insulin in Maun', 'Ventolin inhaler in Palapye'];

const RESULTS = [
  { name: 'Example Pharmacy A', area: 'Gaborone West', note: 'Reported available today' },
  { name: 'Example Pharmacy B', area: 'Broadhurst', note: 'Reported available today' },
  { name: 'Example Pharmacy C', area: 'Mogoditshane', note: 'Reported this week' },
];

// step: 0 idle, 1 user msg, 2 typing, 3 reply, 4..6 cards, 7 reminder, 8 action
const STEP_MS = [600, 900, 1400, 1100, 700, 700, 700, 1100, 3200];

export default function WhatsAppDemo() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.35 });
  const [step, setStep] = useState(reduce ? 8 : 0);
  const [qi, setQi] = useState(0);
  const [typed, setTyped] = useState('');

  // typewriter search box
  useEffect(() => {
    if (reduce || !inView) { setTyped(QUERIES[0]); return; }
    let i = 0, dir = 1, t: number;
    const q = QUERIES[qi];
    const tick = () => {
      i += dir;
      setTyped(q.slice(0, i));
      if (dir === 1 && i >= q.length) { dir = -1; t = window.setTimeout(tick, 1600); return; }
      if (dir === -1 && i <= 0) { setQi((n) => (n + 1) % QUERIES.length); return; }
      t = window.setTimeout(tick, dir === 1 ? 70 : 30);
    };
    t = window.setTimeout(tick, 300);
    return () => window.clearTimeout(t);
  }, [qi, inView, reduce]);

  // chat timeline
  useEffect(() => {
    if (reduce || !inView) return;
    const t = window.setTimeout(() => setStep((s) => (s >= 8 ? 0 : s + 1)), STEP_MS[step]);
    return () => window.clearTimeout(t);
  }, [step, inView, reduce]);

  const bubble = { initial: { opacity: 0, y: 12, scale: 0.96 }, animate: { opacity: 1, y: 0, scale: 1 }, transition: { duration: 0.35 } };

  return (
    <section className="cm-demo" id="whatsapp-demo" ref={ref} aria-label="Example ChekaMeds WhatsApp conversation">
      <style>{`
        .cm-demo{max-width:1180px;margin:0 auto;padding:96px 24px;display:grid;grid-template-columns:1.05fr .95fr;gap:56px;align-items:center}
        .cm-demo h2{font-family:Manrope,system-ui,sans-serif;font-size:clamp(2rem,4.2vw,3.4rem);line-height:1.05;letter-spacing:-.03em;margin:14px 0 18px}
        .cm-demo-lead{color:var(--muted);font-size:1.08rem;line-height:1.65;max-width:520px}
        .cm-demo-search{margin-top:28px;display:flex;align-items:center;gap:12px;background:rgba(255,255,255,.04);border:1px solid var(--line);border-radius:18px;padding:16px 18px;max-width:520px;box-shadow:0 0 0 1px rgba(41,242,154,.05),0 20px 60px rgba(41,242,154,.07)}
        .cm-demo-search svg{color:var(--green);flex:none}
        .cm-demo-typed{font-size:1.05rem;min-height:1.5em;color:var(--white)}
        .cm-caret{display:inline-block;width:2px;height:1.1em;background:var(--green);margin-left:2px;vertical-align:-.15em;animation:cmblink 1s steps(1) infinite}
        @keyframes cmblink{50%{opacity:0}}
        .cm-demo-points{list-style:none;padding:0;margin:26px 0 0;display:grid;gap:12px;max-width:520px}
        .cm-demo-points li{display:flex;gap:12px;color:var(--muted);line-height:1.5}
        .cm-demo-points b{color:var(--white);font-weight:600}
        .cm-demo-points i{flex:none;width:8px;height:8px;border-radius:50%;background:var(--green);margin-top:8px;box-shadow:0 0 12px var(--green)}
        .cm-demo-cta{margin-top:30px;display:inline-flex;align-items:center;gap:10px;background:var(--green);color:#03150d!important;font-weight:700;padding:14px 22px;border-radius:999px;transition:transform .2s,box-shadow .2s}
        .cm-demo-cta:hover{transform:translateY(-2px);box-shadow:0 12px 36px rgba(41,242,154,.35)}
        .cm-phone-wrap{position:relative;display:flex;justify-content:center}
        .cm-phone-wrap:before{content:"";position:absolute;inset:8% 6%;background:radial-gradient(closest-side,rgba(41,242,154,.28),transparent);filter:blur(30px)}
        .cm-phone{position:relative;width:min(340px,100%);border-radius:40px;padding:10px;background:linear-gradient(160deg,#1a2a22,#0a120e);border:1px solid rgba(211,255,232,.18);box-shadow:0 40px 90px rgba(0,0,0,.6)}
        .cm-phone-screen{border-radius:31px;overflow:hidden;background:#0b141a;height:620px;display:flex;flex-direction:column}
        .cm-wa-head{display:flex;align-items:center;gap:10px;padding:16px 16px 12px;background:#12201a;border-bottom:1px solid rgba(255,255,255,.06)}
        .cm-wa-av{width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,var(--green),#0d8f5a);display:grid;place-items:center;color:#03150d;font-weight:800;font-size:.8rem}
        .cm-wa-head b{display:block;font-size:.95rem}
        .cm-wa-head small{color:var(--green2);font-size:.72rem}
        .cm-wa-body{flex:1;padding:14px 12px;display:flex;flex-direction:column;gap:8px;justify-content:flex-end;overflow:hidden;background-image:radial-gradient(rgba(255,255,255,.025) 1px,transparent 1px);background-size:14px 14px}
        .cm-msg{max-width:84%;padding:9px 12px;border-radius:14px;font-size:.88rem;line-height:1.4;position:relative}
        .cm-msg.me{align-self:flex-end;background:#0f5c3f;border-bottom-right-radius:4px}
        .cm-msg.bot{align-self:flex-start;background:#1b2a24;border-bottom-left-radius:4px}
        .cm-msg small{display:flex;justify-content:flex-end;gap:3px;align-items:center;color:rgba(255,255,255,.5);font-size:.65rem;margin-top:3px}
        .cm-dots{display:flex;gap:4px;padding:4px 2px}
        .cm-dots span{width:6px;height:6px;border-radius:50%;background:#7fa595;animation:cmdot 1s infinite}
        .cm-dots span:nth-child(2){animation-delay:.15s}.cm-dots span:nth-child(3){animation-delay:.3s}
        @keyframes cmdot{0%,60%,100%{transform:translateY(0);opacity:.5}30%{transform:translateY(-4px);opacity:1}}
        .cm-card{align-self:flex-start;width:88%;display:flex;gap:10px;align-items:center;padding:10px 12px;border-radius:14px;background:#14231c;border:1px solid rgba(41,242,154,.18)}
        .cm-card svg{color:var(--green);flex:none}
        .cm-card b{font-size:.84rem;display:block}
        .cm-card span{font-size:.72rem;color:var(--muted)}
        .cm-wa-action{align-self:flex-start;display:flex;align-items:center;gap:8px;font-size:.82rem;font-weight:600;color:var(--green2);padding:8px 14px;border-radius:999px;border:1px solid rgba(41,242,154,.4);background:rgba(41,242,154,.08)}
        .cm-tag{position:absolute;top:-14px;right:14px;z-index:2;background:#0b1511;border:1px solid var(--line);color:var(--muted);font-size:.68rem;letter-spacing:.08em;text-transform:uppercase;padding:6px 12px;border-radius:999px}
        @media(max-width:900px){.cm-demo{grid-template-columns:1fr;padding:64px 20px;gap:44px}.cm-phone-screen{height:600px}}
      `}</style>

      <div>
        <div className="cm-kicker">Search where you already are</div>
        <h2>Ask on WhatsApp.<br />Get your next step in seconds.</h2>
        <p className="cm-demo-lead">
          No app to install. Message ChekaMeds the medicine and your town, and get pointed to participating pharmacies reporting availability.
        </p>
        <div className="cm-demo-search" aria-hidden="true">
          <Search size={20} />
          <span className="cm-demo-typed">{typed}<span className="cm-caret" /></span>
        </div>
        <ul className="cm-demo-points">
          <li><i /><span><b>Works on any phone with WhatsApp</b> and a light data connection.</span></li>
          <li><i /><span><b>Reported availability, not a guarantee.</b> Always confirm stock, price and hours with the pharmacy.</span></li>
          <li><i /><span><b>Built in Botswana</b> for patients, pharmacies and healthcare partners.</span></li>
        </ul>
        <a className="cm-demo-cta" href={WA_LINK} target="_blank" rel="noopener noreferrer">
          <MessageCircle size={18} /> Try it on WhatsApp
        </a>
      </div>

      <div className="cm-phone-wrap">
        <div className="cm-phone">
          <span className="cm-tag">Example conversation</span>
          <div className="cm-phone-screen">
            <div className="cm-wa-head">
              <div className="cm-wa-av">CM</div>
              <div><b>ChekaMeds</b><small>online</small></div>
            </div>
            <div className="cm-wa-body" aria-live="off">
              <AnimatePresence mode="popLayout">
                {step >= 1 && (
                  <motion.div key="u" className="cm-msg me" {...bubble}>
                    Panado 500mg, Gaborone
                    <small>09:41 <CheckCheck size={12} color="#53bdeb" /></small>
                  </motion.div>
                )}
                {step === 2 && (
                  <motion.div key="t" className="cm-msg bot" {...bubble} exit={{ opacity: 0 }}>
                    <div className="cm-dots"><span /><span /><span /></div>
                  </motion.div>
                )}
                {step >= 3 && (
                  <motion.div key="r" className="cm-msg bot" {...bubble}>
                    Here are participating pharmacies near Gaborone reporting Panado 500mg:
                  </motion.div>
                )}
                {RESULTS.map((r, i) =>
                  step >= 4 + i ? (
                    <motion.div key={r.name} className="cm-card" {...bubble}>
                      <MapPin size={18} />
                      <div><b>{r.name}</b><span>{r.area} · {r.note}</span></div>
                    </motion.div>
                  ) : null
                )}
                {step >= 7 && (
                  <motion.div key="n" className="cm-msg bot" {...bubble}>
                    Please call to confirm stock, price and opening hours before you travel.
                  </motion.div>
                )}
                {step >= 8 && (
                  <motion.div key="a" className="cm-wa-action" {...bubble}>
                    <MessageCircle size={15} /> Message the pharmacy
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
