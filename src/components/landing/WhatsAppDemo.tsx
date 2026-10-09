import { useEffect, useMemo, useRef, useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence, useInView, useReducedMotion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { MapPin, MessageCircle, CheckCheck, Search, ArrowRight, UserRound, Lock, ChevronLeft, Phone, Video, Plus, Mic, Signal, Wifi, BatteryFull } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import LazyVideo from './LazyVideo';

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

  // soft 3D parallax: pointer moves the stage, phone and browser tilt in opposite depth
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 90, damping: 18 });
  const sy = useSpring(py, { stiffness: 90, damping: 18 });
  const phoneRY = useTransform(sx, [-1, 1], [-10, 6]);
  const phoneRX = useTransform(sy, [-1, 1], [5, -5]);
  const webRY = useTransform(sx, [-1, 1], [6, -3]);
  const webRX = useTransform(sy, [-1, 1], [3, -3]);
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (reduce) return;
    const r = e.currentTarget.getBoundingClientRect();
    px.set(((e.clientX - r.left) / r.width) * 2 - 1);
    py.set(((e.clientY - r.top) / r.height) * 2 - 1);
  };

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
        .cm-demo{position:relative;padding:110px 24px 120px;overflow:hidden;isolation:isolate}
        .cm-demo:before{content:"";position:absolute;inset:0;z-index:-2;background:
          radial-gradient(60% 50% at 70% 38%,rgba(41,242,154,.17),transparent 70%),
          radial-gradient(45% 40% at 18% 70%,rgba(24,130,92,.2),transparent 70%),
          linear-gradient(180deg,#050a08 0%,#07130e 45%,#050a08 100%)}
        .cm-demo:after{content:"";position:absolute;inset:0;z-index:-1;pointer-events:none;opacity:.5;background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2'/><feColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 .08 0'/></filter><rect width='160' height='160' filter='url(%23n)'/></svg>");mix-blend-mode:overlay}
        .cm-bgvideo{position:absolute!important;inset:0;z-index:-2;opacity:.5;-webkit-mask-image:radial-gradient(90% 80% at 50% 45%,#000 30%,transparent 100%);mask-image:radial-gradient(90% 80% at 50% 45%,#000 30%,transparent 100%)}
        .cm-beam{position:absolute;top:-10%;left:50%;width:70%;height:90%;z-index:-1;transform:translateX(-30%) rotate(14deg);background:conic-gradient(from 160deg at 50% 0%,transparent 0 20%,rgba(164,255,210,.07) 28%,transparent 40%);filter:blur(8px);animation:cmbeam 9s ease-in-out infinite alternate}
        @keyframes cmbeam{from{opacity:.55;transform:translateX(-34%) rotate(12deg)}to{opacity:1;transform:translateX(-26%) rotate(16deg)}}
        .cm-floor{position:absolute;left:0;right:0;bottom:0;height:38%;z-index:-1;pointer-events:none;background:
          linear-gradient(180deg,transparent,rgba(5,10,8,.9)),
          repeating-linear-gradient(90deg,rgba(41,242,154,.08) 0 1px,transparent 1px 64px),
          repeating-linear-gradient(0deg,rgba(41,242,154,.06) 0 1px,transparent 1px 48px);
          transform:perspective(500px) rotateX(58deg);transform-origin:50% 100%;-webkit-mask-image:linear-gradient(180deg,transparent,#000 60%);mask-image:linear-gradient(180deg,transparent,#000 60%)}
        .cm-demo-head{max-width:760px;margin:0 auto;text-align:center}
        .cm-demo-head h2{font-family:Manrope,system-ui,sans-serif;font-size:clamp(2rem,4.6vw,3.6rem);line-height:1.04;letter-spacing:-.03em;margin:14px 0 16px}
        .cm-demo-lead{color:var(--muted);font-size:1.08rem;line-height:1.65;margin:0 auto;max-width:600px}
        .cm-person{margin:26px auto 0;display:inline-flex;align-items:center;gap:12px;color:var(--muted);font-size:.9rem;padding:8px 16px 8px 8px;border-radius:999px;border:1px solid var(--line);background:rgba(255,255,255,.035);backdrop-filter:blur(8px)}
        .cm-person-av{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(135deg,#27503e,#0d2219);color:var(--green);box-shadow:0 0 0 2px rgba(41,242,154,.25)}
        .cm-person b{color:var(--white);font-weight:600}

        .cm-stage{position:relative;max-width:1120px;margin:56px auto 0;display:grid;grid-template-columns:minmax(0,1.5fr) minmax(0,1fr);align-items:center;perspective:1400px}
        .cm-link{position:absolute;left:50%;top:50%;width:0;height:0;z-index:0;pointer-events:none}
        .cm-pulse{position:absolute;left:-90px;top:-1px;width:180px;height:2px;background:linear-gradient(90deg,transparent,var(--green),transparent);filter:drop-shadow(0 0 8px var(--green));animation:cmpulse 2.4s linear infinite;opacity:.0}
        .cm-pulse.on{opacity:.9}
        @keyframes cmpulse{from{transform:translateX(-60px)}to{transform:translateX(60px)}}

        .cm-browser{position:relative;z-index:1;transform-style:preserve-3d;border-radius:18px;background:linear-gradient(180deg,#101c16,#0a130f);border:1px solid rgba(211,255,232,.16);box-shadow:0 50px 100px -20px rgba(0,0,0,.75),0 0 0 1px rgba(0,0,0,.4),0 0 80px rgba(41,242,154,.08);overflow:hidden;margin-right:-60px}
        .cm-bar{display:flex;align-items:center;gap:14px;padding:12px 16px;background:linear-gradient(180deg,#16251d,#101c16);border-bottom:1px solid rgba(255,255,255,.06)}
        .cm-dotsrow{display:flex;gap:7px}.cm-dotsrow i{width:11px;height:11px;border-radius:50%;background:#ff5f57}.cm-dotsrow i:nth-child(2){background:#febc2e}.cm-dotsrow i:nth-child(3){background:#28c840}
        .cm-url{flex:1;max-width:340px;margin:0 auto;display:flex;align-items:center;justify-content:center;gap:6px;font-size:.76rem;color:#a9bdb2;background:rgba(0,0,0,.28);border-radius:8px;padding:6px 10px}
        .cm-url svg{color:var(--green)}
        .cm-site{padding:22px 26px 24px;min-height:430px;background:radial-gradient(70% 50% at 20% 0%,rgba(41,242,154,.12),transparent 70%)}
        .cm-site-nav{display:flex;align-items:center;justify-content:space-between;margin-bottom:22px}
        .cm-logo{display:flex;align-items:center;gap:8px;font-family:Manrope,system-ui,sans-serif;font-weight:800}
        .cm-logo i{width:24px;height:24px;border-radius:8px;background:linear-gradient(135deg,var(--green),#0d8f5a)}
        .cm-site-nav span{font-size:.78rem;color:#7d9488;display:flex;gap:16px}
        .cm-site h3{font-family:Manrope,system-ui,sans-serif;font-size:1.5rem;letter-spacing:-.02em;margin:0 0 4px}
        .cm-site p.sub{font-size:.85rem;color:var(--muted);margin:0 0 16px}
        .cm-demo-search{display:flex;align-items:center;gap:10px;background:rgba(255,255,255,.06);border:1px solid rgba(211,255,232,.18);border-radius:14px;padding:6px 6px 6px 14px;transition:border-color .3s,box-shadow .3s;box-shadow:inset 0 1px 0 rgba(255,255,255,.06)}
        .cm-demo-search:focus-within,.cm-demo-search.is-active{border-color:rgba(41,242,154,.6);box-shadow:0 0 0 4px rgba(41,242,154,.1),inset 0 1px 0 rgba(255,255,255,.06)}
        .cm-demo-search>svg{color:var(--green);flex:none}
        .cm-demo-input{flex:1;min-width:0;background:transparent!important;box-shadow:none;border-radius:0;border:0;outline:0;color:var(--white);font:inherit;font-size:1rem;padding:10px 0}
        .cm-demo-input::placeholder{color:#6f857a}
        .cm-demo-go{flex:none;display:inline-flex;align-items:center;gap:6px;border:0;cursor:pointer;background:var(--green);color:#03150d;font-weight:700;font-family:inherit;font-size:.88rem;padding:10px 15px;border-radius:10px;transition:transform .15s,box-shadow .15s}
        .cm-demo-go.press{transform:scale(.93);box-shadow:0 0 0 6px rgba(41,242,154,.28)}
        .cm-caret{display:inline-block;width:2px;height:1.1em;background:var(--green);margin-left:-8px;vertical-align:-.15em;animation:cmblink 1s steps(1) infinite}
        @keyframes cmblink{50%{opacity:0}}
        .cm-res-head{margin:18px 0 6px;font-size:.7rem;letter-spacing:.1em;text-transform:uppercase;color:#7d9488}
        .cm-web-empty{color:#6f857a;font-size:.88rem;padding:30px 4px;text-align:center}
        .cm-row{display:flex;gap:12px;align-items:center;padding:11px 12px;margin-bottom:8px;border-radius:12px;background:rgba(255,255,255,.04);border:1px solid rgba(211,255,232,.08)}
        .cm-row .pin{flex:none;width:34px;height:34px;border-radius:10px;display:grid;place-items:center;background:rgba(41,242,154,.12);color:var(--green)}
        .cm-row b{display:block;font-size:.9rem}
        .cm-row span{font-size:.75rem;color:var(--muted)}
        .cm-hint{margin:14px 0 0;font-size:.72rem;color:#6f857a}

        .cm-phone-wrap{position:relative;z-index:2;display:flex;justify-content:center;transform-style:preserve-3d}
        .cm-phone-shadow{position:absolute;bottom:-34px;left:50%;width:70%;height:34px;transform:translateX(-50%);background:radial-gradient(closest-side,rgba(0,0,0,.7),transparent);filter:blur(10px)}
        .cm-phone-glow{position:absolute;inset:6% -10%;background:radial-gradient(closest-side,rgba(41,242,154,.3),transparent);filter:blur(40px);z-index:-1}
        .cm-phone{position:relative;width:min(318px,100%);border-radius:50px;padding:11px;background:linear-gradient(145deg,#6c7a73 0%,#2a3631 22%,#0e1512 50%,#2c3833 78%,#79877f 100%);box-shadow:0 60px 110px -10px rgba(0,0,0,.8),0 0 0 1px rgba(0,0,0,.6),inset 0 0 0 1.5px rgba(255,255,255,.18),inset 0 0 8px rgba(0,0,0,.6);animation:cmfloat 7s ease-in-out infinite}
        @keyframes cmfloat{50%{transform:translateY(-10px)}}
        .cm-phone:before,.cm-phone:after{content:"";position:absolute;width:3px;border-radius:2px;background:linear-gradient(90deg,#46544d,#1a2420);right:-3px}
        .cm-phone:before{top:150px;height:70px}.cm-phone:after{top:96px;height:38px}
        .cm-phone-screen{position:relative;border-radius:40px;overflow:hidden;background:#0b141a;height:640px;display:flex;flex-direction:column;box-shadow:inset 0 0 0 1px rgba(255,255,255,.04)}
        .cm-sheen{position:absolute;inset:0;z-index:5;pointer-events:none;background:linear-gradient(115deg,transparent 35%,rgba(255,255,255,.07) 45%,transparent 55%);background-size:250% 100%;animation:cmsheen 6s ease-in-out infinite}
        @keyframes cmsheen{from{background-position:130% 0}to{background-position:-60% 0}}
        .cm-island{position:absolute;top:10px;left:50%;transform:translateX(-50%);width:92px;height:26px;border-radius:20px;background:#000;z-index:6}
        .cm-status{display:flex;justify-content:space-between;align-items:center;padding:14px 26px 6px;font-size:.78rem;font-weight:600;background:#0f1c17;color:#e9f3ee}
        .cm-status span{display:flex;gap:5px;align-items:center}
        .cm-wa-head{display:flex;align-items:center;gap:8px;padding:8px 12px 10px;background:#0f1c17;border-bottom:1px solid rgba(255,255,255,.06)}
        .cm-wa-head>svg{color:var(--green2)}
        .cm-wa-av{width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,var(--green),#0d8f5a);display:grid;place-items:center;color:#03150d;font-weight:800;font-size:.75rem}
        .cm-wa-head .who{flex:1}.cm-wa-head b{display:block;font-size:.92rem;line-height:1.1}
        .cm-wa-head small{color:var(--green2);font-size:.68rem}
        .cm-wa-head .ico{display:flex;gap:16px;color:var(--green2)}
        .cm-wa-body{flex:1;padding:12px 10px;display:flex;flex-direction:column;gap:7px;justify-content:flex-end;overflow:hidden;background-color:#0b141a;background-image:radial-gradient(rgba(255,255,255,.035) 1.2px,transparent 1.2px),radial-gradient(rgba(41,242,154,.03) 1.2px,transparent 1.2px);background-size:22px 22px;background-position:0 0,11px 11px}
        .cm-msg{position:relative;max-width:84%;padding:8px 11px;border-radius:12px;font-size:.84rem;line-height:1.38;box-shadow:0 1px 1px rgba(0,0,0,.35)}
        .cm-msg.me{align-self:flex-end;background:#0b5a3e;border-top-right-radius:3px}
        .cm-msg.me:after{content:"";position:absolute;top:0;right:-7px;border:7px solid transparent;border-top-color:#0b5a3e;border-left-color:#0b5a3e}
        .cm-msg.bot{align-self:flex-start;background:#1b2a24;border-top-left-radius:3px}
        .cm-msg.bot:after{content:"";position:absolute;top:0;left:-7px;border:7px solid transparent;border-top-color:#1b2a24;border-right-color:#1b2a24}
        .cm-msg small{display:flex;justify-content:flex-end;gap:3px;align-items:center;color:rgba(255,255,255,.5);font-size:.62rem;margin-top:2px}
        .cm-dots{display:flex;gap:4px;padding:5px 2px}
        .cm-dots span{width:6px;height:6px;border-radius:50%;background:#7fa595;animation:cmdot 1s infinite}
        .cm-dots span:nth-child(2){animation-delay:.15s}.cm-dots span:nth-child(3){animation-delay:.3s}
        @keyframes cmdot{0%,60%,100%{transform:translateY(0);opacity:.5}30%{transform:translateY(-4px);opacity:1}}
        .cm-card{align-self:flex-start;width:90%;display:flex;gap:10px;align-items:center;padding:9px 11px;border-radius:12px;background:#14231c;border:1px solid rgba(41,242,154,.2);box-shadow:0 1px 1px rgba(0,0,0,.35)}
        .cm-card .pin{flex:none;width:30px;height:30px;border-radius:9px;display:grid;place-items:center;background:rgba(41,242,154,.12);color:var(--green)}
        .cm-card b{font-size:.8rem;display:block}.cm-card span{font-size:.68rem;color:var(--muted)}
        .cm-inputbar{display:flex;align-items:center;gap:8px;padding:8px 10px 18px;background:#0f1c17;color:#7fa595}
        .cm-inputbar .field{flex:1;background:#1b2a24;border-radius:20px;padding:8px 14px;font-size:.8rem;color:#6f857a}
        .cm-inputbar .mic{width:34px;height:34px;border-radius:50%;background:var(--green);display:grid;place-items:center;color:#03150d}
        .cm-tag{position:absolute;top:-16px;left:50%;transform:translateX(-50%);z-index:7;white-space:nowrap;background:#0b1511;border:1px solid var(--line);color:var(--muted);font-size:.66rem;letter-spacing:.08em;text-transform:uppercase;padding:6px 12px;border-radius:999px}
        .cm-demo-cta-row{display:flex;justify-content:center;margin-top:64px}
        .cm-demo-cta{display:inline-flex;align-items:center;gap:10px;background:var(--green);color:#03150d!important;font-weight:700;padding:14px 24px;border-radius:999px;transition:transform .2s,box-shadow .2s}
        .cm-demo-cta:hover{transform:translateY(-2px);box-shadow:0 12px 36px rgba(41,242,154,.35)}
        @media(max-width:900px){
          .cm-demo{padding:72px 16px 80px}
          .cm-stage{grid-template-columns:1fr;gap:0;margin-top:40px}
          .cm-browser{margin-right:0}
          .cm-site{padding:18px 16px;min-height:0}
          .cm-site-nav span{display:none}
          .cm-phone-wrap{margin-top:-40px}
          .cm-phone{width:min(300px,86%)}
          .cm-phone-screen{height:600px}
          .cm-link{display:none}
        }
        @media (prefers-reduced-motion:reduce){.cm-phone,.cm-beam,.cm-sheen,.cm-pulse{animation:none}}
      `}</style>
      <LazyVideo className="cm-bgvideo" src="/media/bg-loop.mp4" poster="/media/bg-poster.webp" alt="" />
      <div className="cm-beam" aria-hidden="true" />
      <div className="cm-floor" aria-hidden="true" />

      <div className="cm-demo-head">
        <div className="cm-kicker">One search. Two ways to ask.</div>
        <h2>Search on the website.<br />Or just ask on WhatsApp.</h2>
        <p className="cm-demo-lead">
          Type a medicine and your town. You get the same answer on the website and in WhatsApp: participating pharmacies on ChekaMeds, ready to contact.
        </p>
        <div className="cm-person" aria-hidden="true">
          <span className="cm-person-av"><UserRound size={18} /></span>
          <span><b>Someone in {current.town}</b> needs {current.med}…</span>
        </div>
      </div>

      <div className="cm-stage" onPointerMove={onMove} onPointerLeave={() => { px.set(0); py.set(0); }}>
        <div className="cm-link" aria-hidden="true"><div className={`cm-pulse${sent ? ' on' : ''}`} /></div>

        <motion.div className="cm-browser" style={{ rotateY: webRY, rotateX: webRX }}>
          <div className="cm-bar">
            <div className="cm-dotsrow" aria-hidden="true"><i /><i /><i /></div>
            <div className="cm-url"><Lock size={12} /> chekameds.co.bw/search</div>
          </div>
          <div className="cm-site">
            <div className="cm-site-nav">
              <div className="cm-logo"><i /> ChekaMeds</div>
              <span><em style={{ fontStyle: 'normal' }}>Find medicine</em><em style={{ fontStyle: 'normal' }}>Pharmacies</em><em style={{ fontStyle: 'normal' }}>About</em></span>
            </div>
            <h3>Find your medicine</h3>
            <p className="sub">Search participating pharmacies across Botswana.</p>

            <form className={`cm-demo-search${pressing || (shownText && phase === 0) ? ' is-active' : ''}`} onSubmit={submit} role="search">
              <Search size={19} aria-hidden="true" />
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
              {userText === null && phase === 0 && !reduce && <span className="cm-caret" aria-hidden="true" />}
              <button type="submit" className={`cm-demo-go${pressing ? ' press' : ''}`}>Search <ArrowRight size={15} /></button>
            </form>

            <div className="cm-res-head">Participating pharmacies · example</div>
            <div aria-live="off">
              {phase < 5 && userText === null ? (
                <div className="cm-web-empty">{sent ? 'Searching participating pharmacies…' : 'Results appear here'}</div>
              ) : (
                <AnimatePresence mode="popLayout">
                  {results.map((r, i) =>
                    (userText !== null || phase >= 5 + i) ? (
                      <motion.div key={`${qi}-${r.name}-${i}`} className="cm-row" {...bubble}>
                        <span className="pin"><MapPin size={17} /></span>
                        <div><b>{r.name}</b><span>{r.area} · Participating on ChekaMeds</span></div>
                      </motion.div>
                    ) : null
                  )}
                </AnimatePresence>
              )}
            </div>
            <p className="cm-hint">Try it: type your own medicine and press Search. Availability is reported by pharmacies; always confirm stock, price and hours.</p>
          </div>
        </motion.div>

        <motion.div className="cm-phone-wrap" style={{ rotateY: phoneRY, rotateX: phoneRX }}>
          <div className="cm-phone-glow" aria-hidden="true" />
          <div className="cm-phone-shadow" aria-hidden="true" />
          <div className="cm-phone">
            <span className="cm-tag">Example conversation</span>
            <div className="cm-phone-screen">
              <div className="cm-island" aria-hidden="true" />
              <div className="cm-sheen" aria-hidden="true" />
              <div className="cm-status" aria-hidden="true"><span>09:41</span><span><Signal size={13} /><Wifi size={13} /><BatteryFull size={15} /></span></div>
              <div className="cm-wa-head">
                <ChevronLeft size={22} />
                <div className="cm-wa-av">CM</div>
                <div className="who"><b>ChekaMeds</b><small>online</small></div>
                <div className="ico"><Video size={19} /><Phone size={18} /></div>
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
                        <span className="pin"><MapPin size={16} /></span>
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
              <div className="cm-inputbar" aria-hidden="true">
                <Plus size={22} /><div className="field">Message</div><span className="mic"><Mic size={17} /></span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="cm-demo-cta-row">
        <a className="cm-demo-cta" href={WA_LINK} target="_blank" rel="noopener noreferrer">
          <MessageCircle size={18} /> Try it on WhatsApp
        </a>
      </div>
    </section>
  );
}
