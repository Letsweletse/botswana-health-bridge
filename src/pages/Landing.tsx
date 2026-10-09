import { useState, lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Activity, ArrowDownRight, ArrowRight, ArrowUpRight, Building2, Check, ChevronRight, HeartPulse, Menu, MessageCircle, Network, Search, ShieldCheck, Users, X, Zap, Phone, MapPin } from 'lucide-react';
import logoMark from '@/assets/chekameds-mark.webp';
import SevenSeg, { segStyles } from '@/components/landing/SevenSeg';
const WhatsAppDemo = lazy(() => import('@/components/landing/WhatsAppDemo'));
const Moments = lazy(() => import('@/components/landing/Moments'));

const whatsappSearch = 'https://wa.me/26771424486?text=' + encodeURIComponent('Hi ChekaMeds, I am looking for a medicine. Please help me find a pharmacy with availability.');

const reveal = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] } },
};

const stats = [
  { value: '40+', to: 40, suffix: '+', label: 'Participating pharmacies', icon: Building2 },
  { value: '800+', to: 800, suffix: '+', label: 'Reported unique users', icon: Users },
  { value: '1,600+', to: 1600, suffix: '+', label: 'Monthly medicine searches', icon: Search },
];

const Counter = ({ to, suffix }: { to: number; suffix: string }) => {
  const reduce = useReducedMotion();
  const [n, setN] = useState(0);
  const run = () => {
    if (reduce) { setN(to); return; }
    const t0 = performance.now(), dur = 1500;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      setN(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  return (
    <motion.span className="cm-stat-num" viewport={{ once: true, amount: .5 }} onViewportEnter={run}>
      <SevenSeg text={n.toLocaleString('en-US')} label={`${to.toLocaleString('en-US')}${suffix}`} />
      <i aria-hidden="true">{suffix}</i>
    </motion.span>
  );
};

const services = [
  {
    number: '01',
    icon: Search,
    tag: 'For patients and caregivers',
    title: 'Find medicines with less running around.',
    body: 'Search online or through WhatsApp to discover pharmacies reporting availability before you travel.',
    link: '/search',
    linkText: 'Find a medicine',
    tone: 'mint',
  },
  {
    number: '02',
    icon: Network,
    tag: 'For pharmacies',
    title: 'Make your availability easier to find.',
    body: 'Connect your pharmacy to a wider network and help customers discover listed medicines and reach your team.',
    link: '/facilities',
    linkText: 'Join the network',
    tone: 'blue',
  },
  {
    number: '03',
    icon: Activity,
    tag: 'For healthcare partners',
    title: 'Turn demand signals into insight.',
    body: 'Build better visibility into what people are searching for and where availability gaps may need attention.',
    link: '/facilities',
    linkText: 'Explore partnerships',
    tone: 'violet',
  },
];

const steps = [
  { n: '01', title: 'Search', body: 'Enter a medicine name on the website or send a WhatsApp message.' },
  { n: '02', title: 'Compare', body: 'Review the participating locations and availability information returned.' },
  { n: '03', title: 'Connect', body: 'Contact the pharmacy to confirm stock and plan your visit.' },
];

export default function Landing() {
  const reduceMotion = useReducedMotion();
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="cm-launch">
      <style>{`
        .cm-launch{--bg:#050a08;--panel:#0b1511;--panel2:#101d17;--green:#29f29a;--green2:#a4ffd2;--white:#f4fff9;--muted:#9aada4;--line:rgba(211,255,232,.12);--mono:ui-monospace,SFMono-Regular,'SF Mono',Menlo,Consolas,monospace;font-family:'DM Sans',system-ui,sans-serif;background:var(--bg);color:var(--white);overflow:hidden}
        .cm-launch *{box-sizing:border-box}
        .cm-launch a{color:inherit;text-decoration:none}
        .cm-launch button{font:inherit}
        .cm-wrap{width:min(1180px,calc(100% - 48px));margin:0 auto}
        .cm-header{height:82px;display:flex;align-items:center;justify-content:space-between;position:relative;z-index:30;border-bottom:1px solid var(--line)}
        .cm-brand{display:inline-flex;align-items:center;gap:11px;font:800 1.35rem Manrope,sans-serif;letter-spacing:-.06em}
        .cm-brand-img{width:36px;height:36px;border-radius:11px;box-shadow:0 0 30px rgba(41,242,154,.25)}
        .cm-brand-mark{width:34px;height:34px;border-radius:11px;background:linear-gradient(145deg,#9dffd0,#20db86);display:grid;place-items:center;color:#032b19;box-shadow:0 0 32px rgba(41,242,154,.2)}
        .cm-brand span{color:var(--green)}
        .cm-nav{display:flex;align-items:center;gap:29px;color:#c0d0c7;font-size:.88rem}
        .cm-nav a:hover{color:var(--green)}
        .cm-header-actions{display:flex;align-items:center;gap:10px}
        .cm-btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;padding:13px 20px;border:1px solid transparent;border-radius:8px;font-size:.88rem;font-weight:700;transition:transform .25s ease,background .25s ease,border-color .25s ease;cursor:pointer}
        .cm-btn:hover{transform:translateY(-2px)}
        .cm-btn-primary{background:var(--green);color:#032313!important;box-shadow:0 8px 30px rgba(41,242,154,.13)}
        .cm-btn-primary:hover{background:#6effba}
        .cm-btn-ghost{border-color:var(--line);background:rgba(255,255,255,.025);color:var(--white)}
        .cm-btn-ghost:hover{border-color:rgba(41,242,154,.45);background:rgba(41,242,154,.06)}
        .cm-menu-toggle{display:none;background:transparent;border:1px solid var(--line);color:var(--white);border-radius:12px;width:44px;height:44px;align-items:center;justify-content:center}
        .cm-hero{min-height:660px;display:grid;grid-template-columns:1.03fr .97fr;align-items:center;gap:28px;padding:76px 0 66px;position:relative}
        .cm-hero-copy{position:relative;z-index:2;padding:14px 0}
        .cm-eyebrow{display:inline-flex;align-items:center;gap:9px;border:1px solid rgba(41,242,154,.25);background:rgba(41,242,154,.055);padding:9px 13px;border-radius:7px;color:#b8ffda;letter-spacing:.005em;font-size:.76rem;font-weight:600}
        .cm-live-dot{width:7px;height:7px;border-radius:50%;background:var(--green);box-shadow:0 0 13px var(--green);animation:cmPulse 2s infinite}
        .cm-hero h1{font:700 clamp(3rem,5.7vw,5.4rem)/.99 Manrope,sans-serif;letter-spacing:-.075em;margin:26px 0 23px;max-width:720px}
        .cm-hero h1 .cm-word{display:inline-block;margin-right:.26em;will-change:transform,opacity}
        .cm-hero h1 .cm-shine{display:inline-block;padding-bottom:.08em;color:transparent;background:linear-gradient(100deg,#20db86 0%,#29f29a 30%,#e6fff3 46%,#29f29a 58%,#20db86 100%);background-size:260% 100%;background-position:100% 0;-webkit-background-clip:text;background-clip:text;text-shadow:none;filter:drop-shadow(0 0 28px rgba(41,242,154,.22));animation:cmShine 5.5s ease-in-out 1.9s infinite}
        @keyframes cmShine{0%{background-position:100% 0}45%,100%{background-position:0% 0}}
        @media(prefers-reduced-motion:reduce){.cm-hero h1 .cm-shine{animation:none;background-position:50% 0}}
        .cm-hero h1 .cm-highlight{color:var(--green);text-shadow:0 0 45px rgba(41,242,154,.16)}
        .cm-hero-lead{max-width:570px;color:#b2c2ba;font-size:1.08rem;line-height:1.8;margin:0 0 28px}
        .cm-hero-actions{display:flex;flex-wrap:wrap;gap:11px}
        .cm-trust-note{display:flex;align-items:center;gap:9px;color:#8fa69a;font-size:.78rem;margin-top:22px}
        .cm-trust-note svg{color:var(--green)}
        .cm-hero{position:relative;grid-template-columns:minmax(0,640px)!important;min-height:min(86vh,760px);align-items:center;padding:96px 0 84px!important}
        .cm-cine{position:absolute;top:0;bottom:0;left:50%;width:100vw;transform:translateX(-50%);z-index:0;overflow:hidden;background:#050a08}
        .cm-cine img{position:absolute;top:0;right:0;width:78%;height:100%;object-fit:cover;object-position:12% 40%;-webkit-mask-image:linear-gradient(90deg,transparent 0,#000 34%);mask-image:linear-gradient(90deg,transparent 0,#000 34%)}
        .cm-cine-shade{position:absolute;inset:0;background:
          linear-gradient(90deg,rgba(5,10,8,.96) 0%,rgba(5,10,8,.86) 30%,rgba(5,10,8,.35) 62%,rgba(5,10,8,.08) 100%),
          linear-gradient(180deg,rgba(5,10,8,.55) 0%,transparent 22%,transparent 62%,rgba(5,10,8,.95) 100%),
          radial-gradient(70% 60% at 82% 45%,transparent 40%,rgba(5,10,8,.5) 100%)}
        .cm-cine-shade:after{content:"";position:absolute;inset:0;background:radial-gradient(40% 50% at 80% 40%,rgba(41,242,154,.14),transparent 70%);mix-blend-mode:screen}
        .cm-cine-hud{position:absolute;right:max(24px,calc((100vw - 1180px)/2));top:28px;bottom:36px;width:min(38vw,420px);pointer-events:none}
        .cm-cine-hud i{position:absolute;width:26px;height:26px;border:2px solid rgba(41,242,154,.55)}
        .cm-cine-hud i:nth-child(1){top:0;left:0;border-right:0;border-bottom:0}.cm-cine-hud i:nth-child(2){top:0;right:0;border-left:0;border-bottom:0}
        .cm-cine-hud i:nth-child(3){bottom:0;left:0;border-right:0;border-top:0}.cm-cine-hud i:nth-child(4){bottom:0;right:0;border-left:0;border-top:0}
        .cm-contacts{display:flex;flex-wrap:wrap;gap:10px 22px;margin-top:26px;padding-top:20px;border-top:1px solid rgba(211,255,232,.14);max-width:560px}
        .cm-contacts a,.cm-contacts span{display:inline-flex;align-items:center;gap:8px;font-size:.84rem;color:#a9bdb2}
        .cm-contacts svg{color:var(--green)}
        .cm-contacts b{color:#f4fff9;font-weight:600}
        .cm-contacts a:hover b{color:var(--green)}
        @media(max-width:700px){
          .cm-hero{min-height:0;padding:0 0 48px!important;align-items:end}
          .cm-cine{bottom:auto;height:350px}.cm-cine img{width:100%;object-position:32% 40%;-webkit-mask-image:none;mask-image:none}
          .cm-cine-shade{background:linear-gradient(180deg,rgba(5,10,8,.25) 0%,rgba(5,10,8,.05) 40%,rgba(5,10,8,.8) 85%,#050a08 100%)}
          .cm-cine-hud{display:none}
          .cm-hero-copy{padding-top:270px}
        }
        .cm-photo{position:relative;justify-self:center;width:min(100%,430px);border-radius:30px;overflow:hidden;border:1px solid rgba(211,255,232,.16);box-shadow:0 40px 90px -30px rgba(0,0,0,.85),0 0 90px rgba(41,242,154,.12);background:#0b1511}
        .cm-photo img{display:block;width:100%;height:auto;aspect-ratio:4/5;object-fit:cover}
        .cm-photo:after{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(180deg,transparent 55%,rgba(5,10,8,.75) 100%)}
        .cm-photo-chip{position:absolute;left:16px;bottom:34px;z-index:2;display:inline-flex;align-items:center;gap:8px;padding:9px 14px;border-radius:7px;font-size:.82rem;font-weight:600;background:rgba(8,21,14,.78);border:1px solid rgba(41,242,154,.35);backdrop-filter:blur(6px)}
        .cm-photo-chip i{width:8px;height:8px;border-radius:50%;background:var(--green);box-shadow:0 0 10px var(--green)}
        .cm-photo-note{position:absolute;left:18px;bottom:12px;z-index:2;font-size:.64rem;color:#9fb5aa}
        .cm-visual{min-height:480px;position:relative;display:grid;place-items:center;isolation:isolate}
        .cm-visual-glow{position:absolute;width:78%;aspect-ratio:1;border-radius:50%;background:radial-gradient(circle,rgba(28,225,133,.18),rgba(19,105,67,.08) 38%,transparent 70%);filter:blur(12px);animation:cmBreathe 7s ease-in-out infinite}
        .cm-visual-grid{position:absolute;inset:0;background-image:linear-gradient(rgba(126,255,190,.055) 1px,transparent 1px),linear-gradient(90deg,rgba(126,255,190,.055) 1px,transparent 1px);background-size:34px 34px;mask-image:radial-gradient(ellipse at center,#000 10%,transparent 72%);opacity:.55}
        .cm-orbit{position:absolute;width:min(90%,480px);aspect-ratio:1;border:1px solid rgba(92,255,171,.19);border-radius:50%;animation:cmSpin 32s linear infinite}
        .cm-orbit:before,.cm-orbit:after{content:'';position:absolute;border:1px solid rgba(92,255,171,.14);border-radius:50%;inset:12%}
        .cm-orbit:after{inset:25%;border-color:rgba(92,255,171,.12)}
        .cm-core{position:relative;width:190px;aspect-ratio:1;border-radius:44px;transform:rotate(-8deg);display:grid;place-items:center;background:linear-gradient(145deg,rgba(33,255,151,.16),rgba(12,32,22,.8));border:1px solid rgba(122,255,188,.42);box-shadow:0 0 80px rgba(25,245,140,.16),inset 0 0 35px rgba(90,255,170,.07);backdrop-filter:blur(16px)}
        .cm-core:before{content:'';position:absolute;inset:12px;border:1px solid rgba(134,255,193,.16);border-radius:34px}
        .cm-core svg{width:82px;height:82px;color:var(--green);filter:drop-shadow(0 0 20px rgba(41,242,154,.36));transform:rotate(8deg)}
        .cm-node{position:absolute;z-index:2;display:flex;align-items:center;gap:10px;padding:12px 14px;background:rgba(8,21,14,.83);border:1px solid rgba(151,255,197,.2);border-radius:16px;box-shadow:0 18px 50px rgba(0,0,0,.22);backdrop-filter:blur(14px);animation:cmFloat 6s ease-in-out infinite}
        .cm-node-icon{width:35px;height:35px;border-radius:11px;background:rgba(41,242,154,.1);color:var(--green);display:grid;place-items:center}
        .cm-node strong{display:block;font-size:.76rem;font-weight:700}
        .cm-node small{display:block;color:#8fa69a;font-size:.68rem;margin-top:3px}
        .cm-node-a{top:12%;left:0}.cm-node-b{top:26%;right:-2%;animation-delay:-1.5s}.cm-node-c{bottom:18%;left:2%;animation-delay:-3s}.cm-node-d{bottom:9%;right:0;animation-delay:-4s}
        .cm-node .cm-status{width:6px;height:6px;border-radius:50%;background:var(--green);display:inline-block;margin-right:5px}
        .cm-scroll-cue{position:absolute;bottom:24px;left:0;display:flex;align-items:center;gap:9px;color:#73897e;font-size:.72rem;letter-spacing:.02em}
        .cm-scroll-cue svg{color:var(--green)}
        .cm-stats{position:relative;border-top:1px solid var(--line);border-bottom:1px solid var(--line);background:linear-gradient(180deg,rgba(255,51,71,.055),rgba(255,51,71,.012) 58%,transparent)}
        .cm-stats::before{content:'';position:absolute;top:-1px;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(255,51,71,.45),transparent)}
        .cm-stats-inner{display:grid;grid-template-columns:repeat(3,minmax(0,1fr))}
        .cm-stat{padding:26px 36px;border-right:1px solid var(--line);display:flex;flex-direction:column;align-items:flex-start;position:relative}
        .cm-stat:first-child{padding-left:0}.cm-stat:last-child{border-right:0}
        ${segStyles}
        .cm-stat-head{display:flex;align-items:center;gap:9px;margin-bottom:16px}
        .cm-stat-dot{width:7px;height:7px;border-radius:50%;background:var(--green);box-shadow:0 0 0 3px rgba(41,242,154,.14)}
        .cm-stat-icon{width:27px;height:27px;border-radius:9px;display:grid;place-items:center;color:#8fa69a;background:rgba(255,255,255,.035);border:1px solid var(--line);flex-shrink:0}
        .cm-stat-num{display:flex;align-items:flex-end;gap:.08em;font-size:1.75rem;line-height:1;color:#ff3347}
        .cm-stat-num i{font-style:normal;font-size:.5em;font-weight:700;color:#ff6472;padding-bottom:.12em}
        .cm-stat-label{font-size:.79rem;color:#8fa69a;margin-top:12px}
        .cm-stat-bar{display:block;width:100%;max-width:120px;height:2px;margin-top:18px;background:rgba(255,51,71,.12);border-radius:2px;overflow:hidden}
        .cm-stat-bar i{display:block;height:100%;background:linear-gradient(90deg,#ff3347,rgba(255,51,71,0));transform-origin:left;animation:cmBar 1.5s cubic-bezier(.2,.7,.2,1) both}
        @keyframes cmBar{from{transform:scaleX(0)}to{transform:scaleX(1)}}
        .cm-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
        @media(prefers-reduced-motion:reduce){.cm-stat-bar i{animation:none}}
        .cm-section{padding:104px 0}
        .cm-section-head{max-width:700px;margin-bottom:48px}
        .cm-section h2{font:700 clamp(2.25rem,4vw,3.65rem)/1.06 Manrope,sans-serif;letter-spacing:-.07em;margin:0 0 18px}
        .cm-section-intro{color:#9eb2a7;line-height:1.8;font-size:1rem;max-width:620px;margin:0}
        .cm-services{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
        .cm-service{min-height:360px;border:1px solid var(--line);border-radius:18px;padding:28px;background:linear-gradient(145deg,rgba(255,255,255,.035),rgba(255,255,255,.012));position:relative;overflow:hidden;transition:transform .3s,border-color .3s,background .3s}
        .cm-service:hover{transform:translateY(-5px);border-color:rgba(41,242,154,.34);background:linear-gradient(145deg,rgba(41,242,154,.07),rgba(255,255,255,.015))}
        .cm-service:after{content:'';position:absolute;width:190px;height:190px;right:-100px;bottom:-100px;border-radius:50%;background:rgba(41,242,154,.09);filter:blur(25px);pointer-events:none}
        .cm-service-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:42px}
        .cm-service-icon{width:51px;height:51px;border-radius:16px;background:rgba(41,242,154,.09);border:1px solid rgba(41,242,154,.15);color:var(--green);display:grid;place-items:center}
        .cm-service-number{font:700 .72rem var(--mono);font-variant-numeric:tabular-nums;letter-spacing:.14em;color:#60766a}
        .cm-service-tag{color:#81cda5;font-size:.73rem;letter-spacing:.005em;font-weight:600}
        .cm-service h3{font:700 1.45rem/1.2 Manrope,sans-serif;letter-spacing:-.045em;margin:12px 0}
        .cm-service p{font-size:.88rem;line-height:1.75;color:#94a99e;margin:0 0 22px}
        .cm-text-link{display:inline-flex;align-items:center;gap:8px;color:var(--green)!important;font-size:.84rem;font-weight:700}
        .cm-text-link svg{transition:transform .2s}.cm-text-link:hover svg{transform:translateX(4px)}
        .cm-process{background:linear-gradient(180deg,transparent,rgba(41,242,154,.035),transparent);border-top:1px solid rgba(41,242,154,.06);border-bottom:1px solid rgba(41,242,154,.06)}
        .cm-process-grid{display:grid;grid-template-columns:.82fr 1.18fr;gap:80px;align-items:start}
        .cm-process-list{border-top:1px solid var(--line)}
        .cm-step{display:grid;grid-template-columns:58px 1fr 22px;gap:16px;align-items:start;padding:24px 0;border-bottom:1px solid var(--line)}
        .cm-step-number{font:700 .78rem var(--mono);font-variant-numeric:tabular-nums;letter-spacing:.1em;color:var(--green);padding-top:4px}
        .cm-step h3{font:700 1.12rem Manrope,sans-serif;margin:0 0 7px;letter-spacing:-.035em}
        .cm-step p{font-size:.86rem;line-height:1.7;color:#93a89c;margin:0;max-width:500px}
        .cm-step>svg{color:#5d7868;margin-top:3px}
        .cm-intelligence{position:relative;overflow:hidden;border:1px solid rgba(41,242,154,.2);border-radius:24px;padding:52px;background:radial-gradient(circle at 100% 0%,rgba(41,242,154,.13),transparent 40%),linear-gradient(140deg,#0d1b14,#07100b 70%)}
        .cm-intel-grid{display:grid;grid-template-columns:1fr .8fr;gap:36px;align-items:center}
        .cm-intelligence h2{font-size:clamp(2.1rem,3.6vw,3.1rem)}
        .cm-intelligence p{color:#a1b7aa;line-height:1.8;font-size:.94rem;max-width:560px}
        .cm-intel-points{display:grid;gap:12px;margin-top:24px}
        .cm-intel-point{display:flex;align-items:center;gap:11px;color:#d5e6dc;font-size:.85rem}
        .cm-intel-point svg{color:var(--green);flex-shrink:0}
        .cm-data-visual{position:relative;min-height:280px;display:grid;place-items:center}
        .cm-data-ring{position:absolute;width:220px;aspect-ratio:1;border:1px solid rgba(41,242,154,.26);border-radius:50%;animation:cmSpin 30s linear infinite}
        .cm-data-ring:before{content:'';position:absolute;inset:24px;border:1px dashed rgba(41,242,154,.2);border-radius:50%}
        .cm-data-core{width:104px;height:104px;border-radius:30px;background:rgba(41,242,154,.1);border:1px solid rgba(41,242,154,.28);display:grid;place-items:center;color:var(--green);box-shadow:0 0 50px rgba(41,242,154,.12)}
        .cm-data-pill{position:absolute;background:#0a1710;border:1px solid rgba(41,242,154,.2);border-radius:13px;padding:10px 12px;color:#b8f8d4;font-size:.72rem;box-shadow:0 12px 25px rgba(0,0,0,.2)}
        .cm-data-pill-a{top:8%;right:0}.cm-data-pill-b{bottom:9%;left:0}.cm-data-pill-c{bottom:6%;right:2%}
        .cm-cta{padding:30px 0 100px}
        .cm-cta-panel{border:1px solid rgba(41,242,154,.24);border-radius:24px;padding:58px;display:flex;align-items:center;justify-content:space-between;gap:30px;background:radial-gradient(ellipse at 0% 100%,rgba(41,242,154,.12),transparent 48%),linear-gradient(125deg,#0c1a12,#07100b)}
        .cm-cta-panel h2{font:700 clamp(2rem,3.5vw,3.3rem)/1.05 Manrope,sans-serif;letter-spacing:-.065em;margin:0 0 13px;max-width:650px}
        .cm-cta-panel p{color:#9eb2a7;line-height:1.7;margin:0;max-width:600px}
        .cm-cta-actions{display:flex;flex-direction:column;gap:10px;flex-shrink:0}
        .cm-disclaimer{color:#6f887a;font-size:.72rem;line-height:1.7;margin-top:22px}
        @keyframes cmPulse{0%,100%{opacity:1;box-shadow:0 0 0 0 rgba(41,242,154,.35)}50%{opacity:.65;box-shadow:0 0 0 6px rgba(41,242,154,0)}}
        @keyframes cmBreathe{0%,100%{transform:scale(.94);opacity:.7}50%{transform:scale(1.07);opacity:1}}
        @keyframes cmSpin{to{transform:rotate(360deg)}}
        @keyframes cmFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
        @media(prefers-reduced-motion:reduce){.cm-launch *, .cm-launch *:before, .cm-launch *:after{animation:none!important;transition:none!important;scroll-behavior:auto!important}}
        @media(max-width:980px){.cm-wrap{width:min(100% - 36px,760px)}.cm-nav{gap:18px}.cm-hero{grid-template-columns:1fr;padding:64px 0 72px;gap:0}.cm-hero-copy{max-width:760px}.cm-visual{min-height:450px;max-width:650px;width:100%;margin:0 auto}.cm-scroll-cue{display:none}.cm-services{grid-template-columns:1fr 1fr}.cm-service:last-child{grid-column:1/-1;min-height:300px}.cm-process-grid{grid-template-columns:1fr;gap:36px}.cm-intelligence{padding:38px}.cm-intel-grid{grid-template-columns:1fr .75fr;gap:18px}.cm-cta-panel{padding:40px}}
        @media(max-width:700px){.cm-wrap{width:calc(100% - 34px)}.cm-header{height:72px}.cm-nav{display:none;position:absolute;top:71px;left:0;right:0;background:#07100b;border-bottom:1px solid var(--line);padding:20px 22px 24px;align-items:stretch;flex-direction:column;gap:20px}.cm-nav.cm-nav-open{display:flex}.cm-header-actions .cm-btn{display:none}.cm-menu-toggle{display:flex}.cm-hero{padding:50px 0 40px;min-height:unset}.cm-hero h1{font-size:clamp(2.75rem,13vw,4.4rem);margin-top:22px}.cm-hero-lead{font-size:.98rem}.cm-hero-actions{flex-direction:column;align-items:stretch}.cm-hero-actions .cm-btn{width:100%}.cm-visual{min-height:360px;margin-top:18px}.cm-orbit{width:86%}.cm-core{width:135px;border-radius:34px}.cm-core svg{width:65px;height:65px}.cm-node{padding:9px 10px;gap:7px;border-radius:12px}.cm-node-icon{width:28px;height:28px}.cm-node strong{font-size:.66rem}.cm-node small{font-size:.59rem}.cm-node-a{top:8%;left:-2%}.cm-node-b{top:20%;right:-2%}.cm-node-c{bottom:17%;left:-2%}.cm-node-d{bottom:7%;right:-1%}.cm-stats-inner{grid-template-columns:1fr}.cm-stat,.cm-stat:first-child{padding:20px 0;border-right:0;border-bottom:1px solid var(--line)}.cm-stat:last-child{border-bottom:0}.cm-stat-num{font-size:1.6rem}.cm-stat-bar{max-width:100%}.cm-section{padding:68px 0}.cm-section-head{margin-bottom:30px}.cm-services{grid-template-columns:1fr}.cm-service,.cm-service:last-child{grid-column:auto;min-height:unset;padding:24px}.cm-service-top{margin-bottom:28px}.cm-intelligence{padding:28px 22px;border-radius:18px}.cm-intel-grid{grid-template-columns:1fr}.cm-data-visual{min-height:250px}.cm-data-ring{width:190px}.cm-cta{padding:0 0 68px}.cm-cta-panel{padding:30px 24px;flex-direction:column;align-items:stretch;border-radius:18px}.cm-cta-actions{width:100%}.cm-cta-actions .cm-btn{width:100%}.cm-disclaimer{font-size:.68rem}}
      `}</style>

      <div className="cm-wrap">
        <header className="cm-header">
          <Link to="/" className="cm-brand" aria-label="ChekaMeds home" onClick={closeMenu}>
            <img className="cm-brand-img" src={logoMark} alt="" width="36" height="36" />
            <span style={{ color: '#f4fff9' }}>Cheka<span>Meds</span></span>
          </Link>
          <nav className={`cm-nav ${menuOpen ? 'cm-nav-open' : ''}`} aria-label="Main navigation">
            <a href="#how-it-works" onClick={closeMenu}>How it works</a>
            <a href="#for-everyone" onClick={closeMenu}>Who it's for</a>
            <a href="#intelligence" onClick={closeMenu}>Healthcare intelligence</a>
            <Link to="/facilities" onClick={closeMenu}>For pharmacies</Link>
          </nav>
          <div className="cm-header-actions">
            <Link to="/search" className="cm-btn cm-btn-primary">Find medicine <ArrowUpRight size={16} /></Link>
            <button className="cm-menu-toggle" aria-label={menuOpen ? 'Close menu' : 'Open menu'} onClick={() => setMenuOpen(!menuOpen)}>
              {menuOpen ? <X size={21} /> : <Menu size={21} />}
            </button>
          </div>
        </header>

        <main>
          <section className="cm-hero">
            <div className="cm-cine" aria-hidden="true">
              <picture>
                <source media="(max-width: 700px)" srcSet="/media/hero-elder-sm.webp" />
                <img src="/media/hero-elder.webp" alt="" width="2100" height="1179" fetchPriority="high" decoding="async" onError={(e) => { const i = e.currentTarget; if (!i.dataset.fb) { i.dataset.fb = '1'; i.parentElement?.querySelectorAll('source').forEach((x) => x.remove()); i.src = '/media/hero-woman.webp'; } }} />
              </picture>
              <div className="cm-cine-shade" />
              <div className="cm-cine-hud"><i /><i /><i /><i /></div>
            </div>
            <motion.div className="cm-hero-copy" initial={reduceMotion ? false : 'hidden'} animate="visible" variants={reveal}>
              <div className="cm-eyebrow"><span className="cm-live-dot" /> Built in Botswana. Designed for better access.</div>
              <h1 aria-label="Medicine access. Reimagined.">
                {['Medicine', 'access.'].map((w, i) => (
                  <motion.span key={w} aria-hidden="true" className="cm-word" initial={reduceMotion ? false : { opacity: 0, y: 34, filter: 'blur(12px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} transition={{ duration: .75, delay: .1 + i * .16, ease: [.2, .7, .2, 1] }}>{w}</motion.span>
                ))}
                <br />
                <motion.span aria-hidden="true" className="cm-highlight cm-shine" initial={reduceMotion ? false : { clipPath: 'inset(0 100% 0 0)', opacity: 0 }} animate={{ clipPath: 'inset(0 0% 0 0)', opacity: 1 }} transition={{ duration: 1.1, delay: .55, ease: [.65, 0, .35, 1] }}>Reimagined.</motion.span>
              </h1>
              <p className="cm-hero-lead">Find medicines faster with ChekaMeds. Search online or on WhatsApp to discover participating pharmacies reporting availability — without calling or travelling from place to place first.</p>
              <div className="cm-hero-actions">
                <Link to="/search" className="cm-btn cm-btn-primary"><Search size={17} /> Search for medicine <ArrowUpRight size={16} /></Link>
                <a href={whatsappSearch} target="_blank" rel="noreferrer" className="cm-btn cm-btn-ghost"><MessageCircle size={17} /> Search on WhatsApp</a>
              </div>
              <div className="cm-contacts">
                <a href={whatsappSearch} target="_blank" rel="noreferrer"><MessageCircle size={15} /> WhatsApp <b>+267 71 424 486</b></a>
                <a href="tel:+26775560140"><Phone size={15} /> Support <b>+267 75 560 140</b></a>
                <span><MapPin size={15} /> <b>Botswana</b></span>
              </div>
              <div className="cm-trust-note"><ShieldCheck size={16} /> No account needed to start searching. Confirm stock with the pharmacy before travelling.</div>
            </motion.div>

            <div className="cm-scroll-cue"><ArrowDownRight size={15} /> Scroll to explore</div>
          </section>
        </main>
      </div>

      <section className="cm-stats" aria-label="ChekaMeds reported traction">
        <div className="cm-wrap cm-stats-inner">
          {stats.map(({ value, to, suffix, label, icon: Icon }, index) => (
            <motion.div key={label} className="cm-stat" initial={reduceMotion ? false : { opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .4 }} transition={{ duration: .5, delay: index * .1 }}>
              <span className="cm-stat-head"><span className="cm-stat-icon"><Icon size={16} /></span><span className="cm-stat-dot" aria-hidden="true" /></span>
              <Counter to={to} suffix={suffix} />
              <span className="cm-sr">{value}</span>
              <span className="cm-stat-label">{label}</span>
              <span className="cm-stat-bar" aria-hidden="true"><i /></span>
            </motion.div>
          ))}
        </div>
      </section>

      <Suspense fallback={null}><WhatsAppDemo /><Moments /></Suspense>

      <div className="cm-wrap">
        <section className="cm-section" id="for-everyone">
          <motion.div className="cm-section-head" variants={reveal} initial="hidden" whileInView="visible" viewport={{ once: true, amount: .3 }}>
                        <h2>Less searching.<br />More useful connections.</h2>
            <p className="cm-section-intro">Medicine availability can be hard to navigate. ChekaMeds brings patients, pharmacies and healthcare partners into a more connected digital experience.</p>
          </motion.div>
          <div className="cm-services">
            {services.map(({ number, icon: Icon, tag, title, body, link, linkText }, index) => (
              <motion.article key={number} className="cm-service" initial={reduceMotion ? false : { opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .2 }} transition={{ duration: .55, delay: index * .09 }}>
                <div className="cm-service-top"><span className="cm-service-icon"><Icon size={23} /></span></div>
                <div className="cm-service-tag">{tag}</div>
                <h3>{title}</h3>
                <p>{body}</p>
                <Link to={link} className="cm-text-link">{linkText} <ArrowRight size={16} /></Link>
              </motion.article>
            ))}
          </div>
        </section>

        <section className="cm-section cm-process" id="how-it-works">
          <div className="cm-process-grid">
            <motion.div variants={reveal} initial="hidden" whileInView="visible" viewport={{ once: true, amount: .3 }}>
                            <h2>Find your next step in three moves.</h2>
              <p className="cm-section-intro">Start with the medicine you need. Use the availability information to decide where to go next.</p>
              <div style={{ marginTop: 28 }}><Link to="/search" className="cm-btn cm-btn-primary">Start a search <ArrowUpRight size={16} /></Link></div>
            </motion.div>
            <div className="cm-process-list">
              {steps.map((step, index) => (
                <motion.div key={step.n} className="cm-step" initial={reduceMotion ? false : { opacity: 0, x: 18 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, amount: .5 }} transition={{ duration: .5, delay: index * .1 }}>
                  <div className="cm-step-number">{step.n}</div>
                  <div><h3>{step.title}</h3><p>{step.body}</p></div>
                  <ChevronRight size={18} />
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="cm-section" id="intelligence">
          <motion.div className="cm-intelligence" initial={reduceMotion ? false : { opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .25 }} transition={{ duration: .65 }}>
            <div className="cm-intel-grid">
              <div>
                                <h2>Healthcare intelligence starts with better visibility.</h2>
                <p>Medication searches and availability updates can reveal useful demand signals. ChekaMeds is building towards insights that help participating pharmacies and healthcare stakeholders understand what people are looking for and where potential gaps may exist.</p>
                <div className="cm-intel-points">
                  <div className="cm-intel-point"><Check size={17} /> Understand medicine search demand</div>
                  <div className="cm-intel-point"><Check size={17} /> Improve visibility into reported availability</div>
                  <div className="cm-intel-point"><Check size={17} /> Support better-informed stock planning</div>
                </div>
              </div>
              <div className="cm-data-visual" aria-hidden="true">
                <div className="cm-data-ring" />
                <div className="cm-data-core"><Activity size={43} /></div>
                <span className="cm-data-pill cm-data-pill-a">Demand signals</span>
                <span className="cm-data-pill cm-data-pill-b">Availability</span>
                <span className="cm-data-pill cm-data-pill-c">Insights</span>
              </div>
            </div>
          </motion.div>
        </section>

        <section className="cm-cta">
          <div className="cm-cta-panel">
            <div>
                            <h2>Looking for medicine — or ready to join the network?</h2>
              <p>Start a search today, or connect with ChekaMeds about listing your pharmacy or partnering with the platform.</p>
            </div>
            <div className="cm-cta-actions">
              <Link to="/search" className="cm-btn cm-btn-primary"><Search size={17} /> Find medicine</Link>
              <Link to="/facilities" className="cm-btn cm-btn-ghost"><Building2 size={17} /> Partner with us</Link>
            </div>
          </div>
          <p className="cm-disclaimer">Availability information may change and can depend on participating pharmacy updates. Always contact the pharmacy to confirm stock, price and opening hours before travelling. ChekaMeds provides medicine discovery information and does not replace professional medical advice.</p>
        </section>
      </div>

    </div>
  );
}
