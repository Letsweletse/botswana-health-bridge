import { useEffect, useMemo, useRef, useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence, useInView, useReducedMotion } from 'framer-motion';
import { MapPin, MessageCircle, CheckCheck, Search, ArrowRight, UserRound, Globe } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const WA_LINK =
  'https://wa.me/26771424486?text=' +
  encodeURIComponent('Hi ChekaMeds, I am looking for a medicine. Please help me find a pharmacy with availability.');

// One shared search drives BOTH the website search bar and the WhatsApp phone.
const SEARCHES = [
  { med: 'Panado 500mg', town: 'Gaborone' },
  { med: 'Amoxicillin', town: 'Francistown' },
  { med: 'Insulin', town: 'Maun' },
  { med: 'Ventolin inhaler', town: 'Palapye' },
];

const FALLBACK = [
  { name: 'Participating pharmacy', area: 'Example listing' },
  { name: 'Participating pharmacy', area: 'Example listing' },
  { name: 'Participating pharmacy', area: 'Example listing' },
];

type Pharm = { name: string; area: string };
const norm = (v?: string | null) => (v || '').toLowerCase().replace(/[^a-z0-9]/g, '');

// phase: 0 typing in the search bar, 1 press search, 2 message appears on phone,
// 3 typing dots, 4 reply, 5-7 pharmacy cards, 8 hold
const PHASE_MS = [0, 650, 800, 1300, 900, 650, 650, 650, 3000];

export default function WhatsAppDemo() {
  const reduce = useReducedMotion();
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.3 });
  const [qi, setQi] = useState(0);
  const [phase, setPhase] = useState(reduce ? 8 : 0);
  const [typed, setTyped] = useState(reduce ? `${SEARCHES[0].med} in ${SEARCHES[0].town}` : '');
  const [userText, setUserText] = useState<string | null>(null); // set once a visitor types their own search

  const current = SEARCHES[qi];
  const demoText = `${current.med} in ${current.town}`;

  // Real participating pharmacies (names + town only, no stock claims). Falls back to a generic example.
  const { data: facilities = [] } = useQuery<{ facility_name: string | null; city_town: string | null; area: string | null }[]>({
    queryKey: ['landing-demo-facilities'],
    enabled: inView,
    staleTime: 10 * 60 * 1000,
    retry: 0,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('chekameds_public_facilities_map')
        .select('facility_name, city_town, area')
        .limit(120);
      if (error) throw error;
      return data || [];
    },
  });

  const results: Pharm[] = useMemo(() => {
    const valid = facilities.filter((f) => f.facility_name);
    const town = norm(current.town);
    const local = valid.filter((f) => norm(f.city_town).includes(town));
    const pick = (local.length >= 3 ? local : valid).slice(0, 3);
    if (pick.length === 0) return FALLBACK;
    return pick.map((f) => ({ name: f.facility_name as string, area: f.area || f.city_town || current.town }));
  }, [facilities, current.town]);

  // typewriter in the website search bar
  useEffect(() => {
    if (reduce || !inView || userText !== null || phase !== 0) return;
    let i = 0;
    let t: number;
    const tick = () => {
      i += 1;
      setTyped(demoText.slice(0, i));
      if (i >= demoText.length) { t = window.setTimeout(() => setPhase(1), 500); return; }
      t = window.setTimeout(tick, 65);
    };
    setTyped('');
    t = window.setTimeout(tick, 350);
    return () => window.clearTimeout(t);
  }, [phase, qi, inView, reduce, userText, demoText]);

  // timeline after the search is submitted
  useEffect(() => {
    if (reduce || !inView || userText !== null || phase === 0) return;
    const t = window.setTimeout(() => {
      if (phase >= 8) { setQi((n) => (n + 1) % SEARCHES.length); setPhase(0); }
      else setPhase(phase + 1);
    }, PHASE_MS[phase]);
    return () => window.clearTimeout(t);
  }, [phase, inView, reduce, userText]);

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    const text = (userText ?? current.med).trim();
    if (text.length < 2) return;
    navigate(`/search?q=${encodeURIComponent(text)}`);
  };

  const bubble = { initial: { opacity: 0, y: 12, scale: 0.96 }, animate: { opacity: 1, y: 0, scale: 1 }, transition: { duration: 0.35 } };
  const shownText = userText ?? typed;
  const pressing = phase === 1 && userText === null;
  const sent = phase >= 2;

  return (
    <section className="cm-demo" id="whatsapp-demo" ref={ref} aria-label="Example ChekaMeds search on the website and on WhatsApp">
      <style>{`
        .cm-demo{max-width:1180px;margin:0 auto;padding:96px 24px;display:grid;grid-template-columns:1.05fr .95fr;gap:56px;align-items:center}
        .cm-demo h2{font-family:Manrope,system-ui,sans-serif;font-size:clamp(2rem,4.2vw,3.4rem);line-height:1.05;letter-spacing:-.03em;margin:14px 0 18px}
        .cm-demo-lead{color:var(--muted);font-size:1.08rem;line-height:1.65;max-width:540px}
        .cm-person{margin-top:26px;display:flex;align-items:center;gap:12px;color:var(--muted);font-size:.9rem}
        .cm-person-av{width:40px;height:40px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(135deg,#1f3a2e,#0d2219);border:1px solid var(--line);color:var(--green)}
        .cm-person b{color:var(--white);font-weight:600}
        .cm-demo-search{margin-top:14px;display:flex;align-items:center;gap:10px;background:rgba(255,255,255,.04);border:1px solid var(--line);border-radius:18px;padding:8px 8px 8px 18px;max-width:540px;box-shadow:0 0 0 1px rgba(41,242,154,.05),0 20px 60px rgba(41,242,154,.07);transition:border-color .3s,box-shadow .3s}
        .cm-demo-search:focus-within,.cm-demo-search.is-active{border-color:rgba(41,242,154,.55)}
        .cm-demo-search>svg{color:var(--green);flex:none}
        .cm-demo-input{flex:1;min-width:0;background:transparent!important;box-shadow:none;border-radius:0;border:0;outline:0;color:var(--white);font:inherit;font-size:1.05rem;padding:10px 0}
        .cm-demo-input::placeholder{color:#6f857a}
        .cm-demo-go{flex:none;display:inline-flex;align-items:center;gap:6px;border:0;cursor:pointer;background:var(--green);color:#03150d;font-weight:700;font-family:inherit;font-size:.92rem;padding:11px 16px;border-radius:12px;transition:transform .15s,box-shadow .15s}
        .cm-demo-go.press{transform:scale(.94);box-shadow:0 0 0 6px rgba(41,242,154,.25)}
        .cm-demo-hint{margin:10px 0 0;font-size:.78rem;color:#6f857a;max-width:540px}
        .cm-caret{display:inline-block;width:2px;height:1.1em;background:var(--green);margin-left:1px;vertical-align:-.15em;animation:cmblink 1s steps(1) infinite}
        @keyframes cmblink{50%{opacity:0}}
        .cm-web{margin-top:16px;max-width:540px;border:1px solid var(--line);border-radius:18px;background:rgba(255,255,255,.025);padding:14px 14px 6px;min-height:236px}
        .cm-web-head{display:flex;align-items:center;gap:8px;font-size:.72rem;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin-bottom:10px}
        .cm-web-head svg{color:var(--green)}
        .cm-web-empty{color:#6f857a;font-size:.9rem;padding:34px 4px;text-align:center}
        .cm-row{display:flex;gap:10px;align-items:center;padding:10px 6px;border-top:1px solid var(--line)}
        .cm-row:first-of-type{border-top:0}
        .cm-row svg{color:var(--green);flex:none}
        .cm-row b{display:block;font-size:.9rem}
        .cm-row span{font-size:.76rem;color:var(--muted)}
        .cm-demo-cta{margin-top:26px;display:inline-flex;align-items:center;gap:10px;background:transparent;color:var(--green2)!important;font-weight:700;padding:13px 20px;border-radius:999px;border:1px solid rgba(41,242,154,.45);transition:transform .2s,box-shadow .2s,background .2s}
        .cm-demo-cta:hover{transform:translateY(-2px);background:rgba(41,242,154,.1)}
        .cm-phone-wrap{position:relative;display:flex;justify-content:center}
        .cm-phone-wrap:before{content:"";position:absolute;inset:8% 6%;background:radial-gradient(closest-side,rgba(41,242,154,.28),transparent);filter:blur(30px)}
        .cm-phone{position:relative;width:min(340px,100%);border-radius:40px;padding:10px;background:linear-gradient(160deg,#1a2a22,#0a120e);border:1px solid rgba(211,255,232,.18);box-shadow:0 40px 90px rgba(0,0,0,.6)}
        .cm-phone-screen{border-radius:31px;overflow:hidden;background:#0b141a;height:620px;display:flex;flex-direction:column}
        .cm-wa-head{display:flex;align-items:center;gap:10px;padding:16px 16px 12px;background:#12201a;border-bottom:1px solid rgba(255,255,255,.06)}
        .cm-wa-av{width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,var(--green),#0d8f5a);display:grid;place-items:center;color:#03150d;font-weight:800;font-size:.8rem}
        .cm-wa-head b{display:block;font-size:.95rem}
        .cm-wa-head small{color:var(--green2);font-size:.72rem}
        .cm-wa-body{flex:1;padding:14px 12px;display:flex;flex-direction:column;gap:8px;justify-content:flex-end;overflow:hidden;background-image:radial-gradient(rgba(255,255,255,.025) 1px,transparent 1px);background-size:14px 14px}
        .cm-msg{max-width:84%;padding:9px 12px;border-radius:14px;font-size:.88rem;line-height:1.4}
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
        @media(max-width:900px){.cm-demo{grid-template-columns:1fr;padding:64px 20px;gap:44px}.cm-phone-screen{height:600px}.cm-web{min-height:0}}
      `}</style>

      <div>
        <div className="cm-kicker">One search. Two ways to ask.</div>
        <h2>Search on the website.<br />Or just ask on WhatsApp.</h2>
        <p className="cm-demo-lead">
          Type a medicine and your town. You get the same answer on the website and in WhatsApp: participating pharmacies on ChekaMeds, ready to contact.
        </p>

        <div className="cm-person" aria-hidden="true">
          <span className="cm-person-av"><UserRound size={20} /></span>
          <span><b>Someone in {current.town}</b> needs {current.med}…</span>
        </div>

        <form className={`cm-demo-search${pressing || (shownText && phase === 0) ? ' is-active' : ''}`} onSubmit={submit} role="search">
          <Search size={20} aria-hidden="true" />
          <input
            className="cm-demo-input"
            aria-label="Search for a medicine"
            placeholder="Search a medicine, e.g. Panado"
            value={shownText}
            onChange={(e) => setUserText(e.target.value)}
            maxLength={80}
            autoComplete="off"
            enterKeyHint="search"
          />
          {userText === null && phase === 0 && !reduce && <span className="cm-caret" aria-hidden="true" style={{ marginLeft: -8 }} />}
          <button type="submit" className={`cm-demo-go${pressing ? ' press' : ''}`}>Search <ArrowRight size={16} /></button>
        </form>
        <p className="cm-demo-hint">Try it: type your own medicine and press Search. Availability is reported by pharmacies; always confirm stock, price and hours.</p>

        <div className="cm-web" aria-live="off">
          <div className="cm-web-head"><Globe size={14} /> Website results · example</div>
          {phase < 5 && userText === null ? (
            <div className="cm-web-empty">{sent ? 'Searching participating pharmacies…' : 'Results appear here'}</div>
          ) : (
            <AnimatePresence mode="popLayout">
              {results.map((r, i) =>
                (userText !== null || phase >= 5 + i) ? (
                  <motion.div key={`${qi}-${r.name}-${i}`} className="cm-row" {...bubble}>
                    <MapPin size={18} />
                    <div><b>{r.name}</b><span>{r.area} · Participating on ChekaMeds</span></div>
                  </motion.div>
                ) : null
              )}
            </AnimatePresence>
          )}
        </div>

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
                {sent && (
                  <motion.div key={`u-${qi}`} className="cm-msg me" {...bubble}>
                    {demoText}
                    <small>09:41 <CheckCheck size={12} color="#53bdeb" /></small>
                  </motion.div>
                )}
                {phase === 3 && (
                  <motion.div key={`t-${qi}`} className="cm-msg bot" {...bubble} exit={{ opacity: 0 }}>
                    <div className="cm-dots"><span /><span /><span /></div>
                  </motion.div>
                )}
                {phase >= 4 && (
                  <motion.div key={`r-${qi}`} className="cm-msg bot" {...bubble}>
                    Participating pharmacies near {current.town} for {current.med}:
                  </motion.div>
                )}
                {results.map((r, i) =>
                  phase >= 5 + i ? (
                    <motion.div key={`c-${qi}-${i}`} className="cm-card" {...bubble}>
                      <MapPin size={18} />
                      <div><b>{r.name}</b><span>{r.area}</span></div>
                    </motion.div>
                  ) : null
                )}
                {phase >= 8 && (
                  <motion.div key={`n-${qi}`} className="cm-msg bot" {...bubble}>
                    Please contact the pharmacy to confirm stock, price and opening hours before you travel.
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
